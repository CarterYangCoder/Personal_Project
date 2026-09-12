const { volunteerProjects } = require('../../data/summer')
const cloudData = require('../../utils/cloud-data')
const recordStore = require('../../utils/record-store')

const QUICK_PROMPTS = [
  { icon: '☀', tone: 'sun', label: '今天先做什么', note: '帮我排个轻松顺序', text: '根据我的记录，今天先做什么？' },
  { icon: '✓', tone: 'mint', label: '帮我拆计划', note: '把困难变成第一步', text: '帮我把一个计划拆成容易开始的小步骤' },
  { icon: '♡', tone: 'rose', label: '推荐一个公益', note: '找件温暖的小事', text: '给我推荐一个适合参加的公益项目' },
  { icon: '✎', tone: 'blue', label: '给我日记灵感', note: '留住今天的小瞬间', text: '给我一个今天的日记灵感' }
]

const MODEL_OPTIONS = [
  { label: 'V4 Flash · 快速', profile: 'flash', note: '适合日常问答' },
  { label: 'V4 Flash · 深度思考', profile: 'thinking', note: '适合计划与分析' },
  { label: 'V4 Pro · 高质量', profile: 'pro', note: '回答更细致' }
]

function includesAny(text, words) {
  return words.some(word => text.includes(word))
}

Page({
  data: {
    displayName: '同学', greeting: '你好', isLoggedIn: false, draft: '', thinking: false, scrollTarget: 'chat-end', providerNote: '在线陪伴中',
    summary: { work: 0, study: 0, volunteer: 0, diary: 0 }, quickPrompts: QUICK_PROMPTS, messages: [],
    modelOptions: MODEL_OPTIONS, modelLabels: MODEL_OPTIONS.map(item => item.label), modelIndex: 0,
    modelLabel: MODEL_OPTIONS[0].label, modelNote: MODEL_OPTIONS[0].note
  },

  onLoad() {
    const hour = new Date().getHours()
    const greeting = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
    const savedModelIndex = Number(wx.getStorageSync('summerAssistantModelIndex'))
    const selected = MODEL_OPTIONS[savedModelIndex] || MODEL_OPTIONS[0]
    this.setData({ greeting, modelIndex: MODEL_OPTIONS.indexOf(selected), modelLabel: selected.label, modelNote: selected.note })
    this.refreshContext()
  },

  onShow() {
    this.refreshContext(false)
  },

  refreshContext(showWelcome = true) {
    const profile = getApp().globalData.profile
    const records = profile ? {
      workTasks: recordStore.read('summerWorkTasks'),
      studyTasks: recordStore.read('summerQuadrantTasks'),
      intents: recordStore.read('summerVolunteerIntents'),
      diaries: recordStore.read('summerDiaries')
    } : { workTasks: [], studyTasks: [], intents: [], diaries: [] }
    this.records = records
    const summary = {
      work: records.workTasks.filter(item => !item.done).length,
      study: records.studyTasks.filter(item => !item.done).length,
      volunteer: records.intents.length,
      diary: records.diaries.length
    }
    this.setData({ displayName: profile ? profile.name : '同学', isLoggedIn: !!profile, summary })
    if (showWelcome && !this.data.messages.length) {
      const content = profile
        ? this.buildWelcome(summary)
        : '嗨，我是你的夏日助手。你可以让我帮忙安排计划、了解公益项目，或找一个记录生活的灵感。登录后，我还能结合你的本机记录给出更贴合的建议。'
      this.setData({ messages: [{ id: Date.now(), role: 'assistant', content }] })
    }
  },

  buildWelcome(summary) {
    const active = summary.work + summary.study
    if (active > 0) return `我看到你还有 ${summary.work} 项工作待办和 ${summary.study} 项学习计划。别急着一起完成，我们先挑一件最值得推进的事。`
    if (summary.diary > 0 || summary.volunteer > 0) return `你的夏天已经留下 ${summary.diary} 篇日记和 ${summary.volunteer} 条公益意向。今天想继续记录，还是尝试一件新鲜的事？`
    return '记录还是空白也没关系。告诉我你今天想完成什么，我会陪你把第一步变得具体一点。'
  },

  updateDraft(e) {
    this.setData({ draft: e.detail.value })
  },

  changeModel(e) {
    const modelIndex = Number(e.detail.value)
    const selected = MODEL_OPTIONS[modelIndex] || MODEL_OPTIONS[0]
    wx.setStorageSync('summerAssistantModelIndex', modelIndex)
    this.setData({ modelIndex, modelLabel: selected.label, modelNote: selected.note })
  },

  usePrompt(e) {
    if (this.data.thinking) return
    this.submit(e.currentTarget.dataset.text)
  },

  sendMessage() {
    if (this.data.thinking) return
    const text = this.data.draft.trim()
    if (!text) return
    this.submit(text)
  },

  async submit(text) {
    const allowCloud = await this.ensureCloudConsent()
    const previousMessages = this.data.messages
    const userMessage = { id: Date.now(), role: 'user', content: text }
    this.setData({ messages: [...previousMessages, userMessage], draft: '', thinking: true, scrollTarget: 'thinking' })
    let reply
    try {
      if (!cloudData.cloudReady() || !allowCloud) throw new Error('cloud unavailable')
      const result = await cloudData.askAssistant({
        message: text,
        history: previousMessages.map(item => ({ role: item.role, content: item.content })),
        context: this.buildCloudContext(),
        modelProfile: MODEL_OPTIONS[this.data.modelIndex].profile
      })
      reply = { content: result.content, action: this.findAction(text) }
      this.setData({ providerNote: '在线陪伴中' })
    } catch (error) {
      reply = this.createReply(text)
      this.setData({ providerNote: '本地灵感模式' })
    }
    const assistantMessage = { id: Date.now() + 1, role: 'assistant', ...reply }
    this.setData({ messages: [...this.data.messages, assistantMessage], thinking: false, scrollTarget: `message-${assistantMessage.id}` })
  },

  ensureCloudConsent() {
    const profile = getApp().globalData.profile
    const consentKey = profile ? `summerAssistantCloudConsent:${profile.openid}` : ''
    if (!profile || wx.getStorageSync(consentKey)) return Promise.resolve(true)
    return new Promise(resolve => {
      wx.showModal({
        title: '允许 AI 读取记录摘要？',
        content: '将发送昵称、待办标题、计划标题、公益项目，以及日记日期、标题和心情；不会发送日记正文。取消后仍可使用本地建议。',
        confirmText: '允许',
        cancelText: '仅本地',
        success: result => {
          if (result.confirm) wx.setStorageSync(consentKey, true)
          resolve(!!result.confirm)
        },
        fail: () => resolve(false)
      })
    })
  },

  buildCloudContext() {
    const { workTasks, studyTasks, intents, diaries } = this.records
    return {
      name: this.data.displayName,
      workTasks: workTasks.filter(item => !item.done).map(item => ({ title: item.title })),
      studyTasks: studyTasks.filter(item => !item.done).map(item => ({ title: item.title, quadrant: item.quadrant })),
      volunteerIntents: intents.map(item => ({ project: item.project, status: item.status })),
      diaries: diaries.map(item => ({ date: item.date, title: item.title, mood: item.mood }))
    }
  },

  findAction(input) {
    const text = input.toLowerCase()
    if (includesAny(text, ['公益', '志愿', '帮助', '参加'])) return { label: '查看公益项目', page: '/pages/volunteer/volunteer' }
    if (includesAny(text, ['日记', '记录', '心情'])) return { label: '去写生活日记', page: '/pages/daily/daily' }
    if (includesAny(text, ['工作', '手册', '项目'])) return { label: '查看工作看板', page: '/pages/work/work' }
    if (includesAny(text, ['计划', '学习', '番茄', '专注', '复习'])) return { label: '打开学习计划', page: '/pages/study/study' }
    return null
  },

  createReply(input) {
    const text = input.toLowerCase()
    const { workTasks, studyTasks, intents, diaries } = this.records
    const openWork = workTasks.filter(item => !item.done)
    const openStudy = studyTasks.filter(item => !item.done)

    if (includesAny(text, ['先做', '今天', '安排', '优先', '待办'])) {
      const urgentStudy = openStudy.find(item => item.quadrant === 'important-urgent')
      const target = urgentStudy || openWork[0] || openStudy[0]
      if (target) {
        const page = urgentStudy || (!openWork.length && openStudy.length) ? '/pages/study/study' : '/pages/work/work'
        return { content: `今天先推进“${target.title}”。只做一个 15 分钟起步：打开相关材料，写下当前进度，再完成最小的一步。结束后再决定要不要继续。`, action: { label: page.includes('study') ? '打开学习计划' : '打开工作待办', page } }
      }
      return { content: '你目前没有未完成事项。可以先写下一件今天最想完成的事，并把它缩小到 25 分钟内能有结果的一步。', action: { label: '新建学习计划', page: '/pages/study/study' } }
    }

    if (includesAny(text, ['拆', '步骤', '计划', '拖延', '开始'])) {
      const target = openStudy[0] || openWork[0]
      const subject = target ? `“${target.title}”` : '这件事'
      return { content: `可以把${subject}拆成四步：① 用一句话写清完成标准；② 收齐开始需要的材料；③ 设一个 25 分钟计时，只完成核心部分；④ 用 5 分钟检查，并记下下一步。先完成第①步就算今天已经启动。`, action: { label: '去学习计划执行', page: '/pages/study/study' } }
    }

    if (includesAny(text, ['公益', '志愿', '帮助', '参加', '推荐'])) {
      const joinedNames = intents.map(item => item.project)
      const project = volunteerProjects.find(item => !joinedNames.includes(item.name)) || volunteerProjects[0]
      return { content: `我推荐“${project.name}”。它目前是${project.status}，可以从“${project.needs[0]}”开始参与。先读清需求，再写一段你能投入的时间和方式，会更容易得到回应。`, action: { label: '查看公益项目', page: '/pages/volunteer/volunteer' } }
    }

    if (includesAny(text, ['日记', '记录', '灵感', '心情', '写'])) {
      const lastDiary = diaries[0]
      const opening = lastDiary ? `上次你写了“${lastDiary.title}”。` : ''
      return { content: `${opening}今天可以从一个很小的瞬间写起：什么事情让你停顿了几秒？当时你看见、听见了什么？如果把今天留给未来的自己一句话，你会写什么？`, action: { label: '去写生活日记', page: '/pages/daily/daily' } }
    }

    if (includesAny(text, ['番茄', '专注', '学习', '复习'])) {
      return { content: `先选一项明确任务，开启 25 分钟专注。把手机里的其他提醒放到一边，只保留当前材料；结束后休息 5 分钟，再决定是否开始下一轮。你现在有 ${openStudy.length} 项未完成学习计划。`, action: { label: '打开番茄钟', page: '/pages/study/study' } }
    }

    if (includesAny(text, ['工作', '手册', '项目', '任务'])) {
      return { content: `新生手册这类项目适合按“内容—协作—校对”检查。你现在有 ${openWork.length} 项工作待办，可以先挑一项最影响他人继续推进的任务完成。`, action: { label: '查看工作看板', page: '/pages/work/work' } }
    }

    return { content: '我现在最擅长帮你安排今日任务、拆解计划、推荐公益项目和提供日记灵感。你可以换一种方式告诉我：你想完成什么，或者现在最卡在哪里？' }
  },

  openAction(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.page })
  }
})
