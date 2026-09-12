const recordStore = require('../../utils/record-store')
const { workPreview } = require('../../utils/mock')

const COLLECTION = 'workTasks'
const STORAGE_PREFIX = 'summerWorkTasks'
const STATUS_OPTIONS = ['待开始', '进行中', '已完成']

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatClock(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultTimes() {
  const start = new Date()
  start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { startTime: formatClock(start), endTime: formatDate(end) === formatDate(start) ? formatClock(end) : '23:59' }
}

function dateLabel(value) {
  if (!value) return '早期待办'
  const parts = value.split('-').map(Number)
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  const today = formatDate()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const prefix = value === today ? '今天' : value === formatDate(yesterday) ? '昨天' : `${parts[1]}月${parts[2]}日`
  return `${prefix} · ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]}`
}

function normalizeTask(task) {
  const status = STATUS_OPTIONS.includes(task.status) ? task.status : task.done ? '已完成' : '待开始'
  const startTime = task.startTime || ''
  const endTime = task.endTime || ''
  return {
    ...task,
    date: task.date || '',
    startTime,
    endTime,
    category: task.category || '日常事务',
    details: task.details || '',
    result: task.result || '',
    status,
    statusKey: status === '已完成' ? 'done' : status === '进行中' ? 'doing' : 'pending',
    done: status === '已完成',
    timeLabel: startTime && endTime ? `${startTime}—${endTime}` : startTime || '未填写时间'
  }
}

Page({
  data: {
    stages: [
      { name: '策划立项', note: '确定“新生第一份校园地图”的定位与目录。' },
      { name: '内容征集', note: '向各部门收集最实用、最真诚的校园经验。' },
      { name: '分工编辑', note: '把每个版块交给最熟悉它的人来讲。' },
      { name: '排版设计', note: '在一页页留白中，找到清爽又有温度的节奏。' },
      { name: '校对定稿', note: '逐字确认，也确认我们想递出的心意。' },
      { name: '印刷交付', note: '等待它被新同学翻开，也就等到了新的相遇。' }
    ],
    team: ['王', '李', '张', '陈', '周', '林', '赵', '徐'],
    statusOptions: STATUS_OPTIONS,
    tasks: [], taskGroups: [], displayTasks: workPreview, workPreview, openTasks: 0, todayCount: 0, completedCount: 0,
    workDate: '', startTime: '', endTime: '', workTitle: '', category: '', details: '', result: '', statusIndex: 1,
    editingId: '', scrollTarget: '', isLoggedIn: false, showComposer: false
  },

  onLoad() { this.resetForm() },
  onShow() { this.refreshLoginState() },

  refreshLoginState() {
    const isLoggedIn = !!getApp().globalData.profile
    this.setData({ isLoggedIn })
    if (isLoggedIn) this.loadTasks()
    else this.updateTasks([])
  },

  goLogin() { getApp().requireLogin('/pages/work/work') },

  loadTasks() {
    this.updateTasks(recordStore.read(STORAGE_PREFIX))
    recordStore.sync(COLLECTION, STORAGE_PREFIX).then(records => {
      if (getApp().globalData.profile) this.updateTasks(records)
    })
  },

  updateTasks(records) {
    const tasks = records.map(normalizeTask).sort((a, b) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '')
      return dateCompare || (b.startTime || '').localeCompare(a.startTime || '')
    })
    const groupMap = new Map()
    tasks.forEach(task => {
      const key = task.date || 'legacy'
      if (!groupMap.has(key)) groupMap.set(key, { date: key, label: dateLabel(task.date), items: [] })
      groupMap.get(key).items.push(task)
    })
    this.setData({
      tasks,
      taskGroups: Array.from(groupMap.values()),
      displayTasks: tasks.length ? tasks.slice(0, 3) : workPreview,
      openTasks: tasks.filter(item => !item.done).length,
      todayCount: tasks.filter(item => item.date === formatDate()).length,
      completedCount: tasks.filter(item => item.done).length
    })
  },

  inputWorkTitle(e) { this.setData({ workTitle: e.detail.value }) },
  inputCategory(e) { this.setData({ category: e.detail.value }) },
  inputDetails(e) { this.setData({ details: e.detail.value }) },
  inputResult(e) { this.setData({ result: e.detail.value }) },
  changeWorkDate(e) { this.setData({ workDate: e.detail.value }) },
  changeStartTime(e) { this.setData({ startTime: e.detail.value }) },
  changeEndTime(e) { this.setData({ endTime: e.detail.value }) },
  changeStatus(e) { this.setData({ statusIndex: Number(e.detail.value) }) },

  async saveTask() {
    const title = this.data.workTitle.trim()
    if (!title) { wx.showToast({ title: '先写下今天做了什么', icon: 'none' }); return }
    if (this.data.startTime && this.data.endTime && this.data.endTime <= this.data.startTime) {
      wx.showToast({ title: '结束时间需要晚于开始时间', icon: 'none' })
      return
    }
    const status = STATUS_OPTIONS[this.data.statusIndex]
    const existing = this.data.tasks.find(item => String(item.id) === this.data.editingId)
    const task = {
      ...(existing || {}),
      id: this.data.editingId || recordStore.createId(),
      date: this.data.workDate,
      startTime: this.data.startTime,
      endTime: this.data.endTime,
      title,
      category: this.data.category.trim() || '日常事务',
      details: this.data.details.trim(),
      result: this.data.result.trim(),
      status,
      done: status === '已完成'
    }
    const wasEditing = !!this.data.editingId
    const saved = await recordStore.put(COLLECTION, STORAGE_PREFIX, task)
    this.updateTasks(saved.records)
    this.resetForm(true)
    this.setData({ showComposer: false })
    wx.showToast({
      title: saved.synced ? (wasEditing ? '记录已更新' : '今天的工作已记下') : '已保存在本机，稍后同步',
      icon: saved.synced ? 'success' : 'none'
    })
  },

  editTask(e) {
    const id = String(e.currentTarget.dataset.id)
    const task = this.data.tasks.find(item => String(item.id) === id)
    if (!task) return
    this.setData({
      editingId: id,
      workDate: task.date || formatDate(),
      startTime: task.startTime || defaultTimes().startTime,
      endTime: task.endTime || defaultTimes().endTime,
      workTitle: task.title,
      category: task.category,
      details: task.details,
      result: task.result,
      statusIndex: Math.max(0, STATUS_OPTIONS.indexOf(task.status)),
      scrollTarget: '', showComposer: true
    }, () => this.setData({ scrollTarget: 'work-form' }))
  },

  cancelEdit() { this.resetForm(true); this.setData({ showComposer: false }) },

  openComposer() {
    if (!this.data.isLoggedIn) { this.goLogin(); return }
    this.resetForm(true)
    this.setData({ showComposer: true })
  },

  closeComposer() { this.cancelEdit() },
  previewHandbook() {
    wx.previewImage({ current: '/assets/images/naxin1.jpg', urls: ['/assets/images/naxin1.jpg'] })
  },
  noop() {},

  async cycleStatus(e) {
    const id = String(e.currentTarget.dataset.id)
    const task = this.data.tasks.find(item => String(item.id) === id)
    if (!task) return
    const currentIndex = Math.max(0, STATUS_OPTIONS.indexOf(task.status))
    const status = STATUS_OPTIONS[(currentIndex + 1) % STATUS_OPTIONS.length]
    const saved = await recordStore.put(COLLECTION, STORAGE_PREFIX, { ...task, status, done: status === '已完成' })
    this.updateTasks(saved.records)
  },

  deleteTask(e) {
    const id = String(e.currentTarget.dataset.id)
    wx.showModal({
      title: '删除这条工作记录？',
      content: '记录中的过程和成果也会一起删除，且无法恢复。',
      success: async result => {
        if (!result.confirm) return
        const removed = await recordStore.remove(COLLECTION, STORAGE_PREFIX, id)
        this.updateTasks(removed.records)
        if (this.data.editingId === id) this.resetForm(true)
        wx.showToast({ title: removed.synced ? '记录已删除' : '已在本机删除，稍后同步', icon: 'none' })
      }
    })
  },

  resetForm(keepDate = false) {
    const times = defaultTimes()
    this.setData({
      editingId: '',
      workDate: keepDate && this.data.workDate ? this.data.workDate : formatDate(),
      startTime: times.startTime,
      endTime: times.endTime,
      workTitle: '', category: '', details: '', result: '', statusIndex: 1, scrollTarget: ''
    })
  }
})
