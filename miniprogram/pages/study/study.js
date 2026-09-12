const recordStore = require('../../utils/record-store')
const { studyPreview } = require('../../utils/mock')

const COLLECTION = 'studyTasks'
const STORAGE_PREFIX = 'summerQuadrantTasks'
const STATUS_OPTIONS = ['待开始', '进行中', '已完成']
const quadrantDefinitions = [
  { key: 'important-urgent', index: 'I', name: '重要且紧急', tone: 'red' },
  { key: 'important', index: 'II', name: '重要不紧急', tone: 'blue' },
  { key: 'urgent', index: 'III', name: '紧急不重要', tone: 'orange' },
  { key: 'later', index: 'IV', name: '不重要不紧急', tone: 'green' }
]

function pad(value) { return String(value).padStart(2, '0') }
function formatDate(date = new Date()) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
function formatClock(date = new Date()) { return `${pad(date.getHours())}:${pad(date.getMinutes())}` }
function defaultTimes() {
  const start = new Date()
  start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  return { startTime: formatClock(start), endTime: formatDate(end) === formatDate(start) ? formatClock(end) : '23:59' }
}
function dateLabel(value) {
  if (!value) return '早期学习计划'
  const parts = value.split('-').map(Number)
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const prefix = value === formatDate() ? '今天' : value === formatDate(yesterday) ? '昨天' : `${parts[1]}月${parts[2]}日`
  return `${prefix} · ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]}`
}
function formatTimer(seconds) { return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}` }
function normalizeTask(task) {
  const status = STATUS_OPTIONS.includes(task.status) ? task.status : task.done ? '已完成' : '待开始'
  const startTime = task.startTime || ''
  const endTime = task.endTime || ''
  return {
    ...task,
    date: task.date || '', startTime, endTime,
    subject: task.subject || '自主学习', details: task.details || '', result: task.result || '',
    quadrant: task.quadrant || 'important', visibility: task.visibility === '公开' ? '可分享' : (task.visibility || '私密'),
    status, done: status === '已完成',
    statusKey: status === '已完成' ? 'done' : status === '进行中' ? 'doing' : 'pending',
    timeLabel: startTime && endTime ? `${startTime}—${endTime}` : startTime || '未填写时间'
  }
}

Page({
  data: {
    wink: false, isLoggedIn: false,
    tasks: [], taskGroups: [], displayTasks: studyPreview, studyPreview, quadrants: [], todayCount: 0, openTasks: 0, completedCount: 0,
    quadrantNames: quadrantDefinitions.map(item => item.name), quadrantIndex: 1,
    visibilityOptions: ['私密', '可分享'], visibilityIndex: 0,
    statusOptions: STATUS_OPTIONS, statusIndex: 1,
    studyDate: '', startTime: '', endTime: '', studyTitle: '', subject: '', details: '', result: '',
    editingId: '', scrollTarget: '',
    focusMinutes: 25, restMinutes: 5, remainingSeconds: 1500, timerText: '25:00',
    timerMode: 'focus', timerRunning: false, rounds: 0, showComposer: false
  },

  onLoad() { this.resetForm() },
  onShow() { this.refreshLoginState() },
  onHide() { clearInterval(this.timer) },
  onUnload() { clearInterval(this.timer) },

  refreshLoginState() {
    const isLoggedIn = !!getApp().globalData.profile
    this.setData({ isLoggedIn })
    if (!isLoggedIn) {
      clearInterval(this.timer)
      this.timerEndAt = null
      this.updateTasks([])
      this.setData({ timerRunning: false, timerMode: 'focus', rounds: 0, remainingSeconds: 1500, timerText: '25:00' })
      return
    }
    const settings = wx.getStorageSync(this.settingsKey()) || {}
    const focusMinutes = Number(settings.focusMinutes) || 25
    const restMinutes = Number(settings.restMinutes) || 5
    const timerMinutes = this.data.timerMode === 'focus' ? focusMinutes : restMinutes
    this.setData({
      focusMinutes, restMinutes, rounds: Number(settings.rounds) || this.data.rounds,
      ...(!this.data.timerRunning ? { remainingSeconds: timerMinutes * 60, timerText: formatTimer(timerMinutes * 60) } : {})
    })
    this.updateTasks(recordStore.read(STORAGE_PREFIX))
    recordStore.sync(COLLECTION, STORAGE_PREFIX).then(records => {
      if (getApp().globalData.profile) this.updateTasks(records)
    })
    if (this.data.timerRunning && this.timerEndAt) this.startTicker()
  },

  goLogin() { getApp().requireLogin('/pages/study/study') },
  settingsKey() {
    const profile = getApp().globalData.profile
    return `summerPomodoroSettings:${profile.openid || profile.name}`
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
      displayTasks: tasks.length ? tasks.slice(0, 4) : studyPreview,
      quadrants: quadrantDefinitions.map(definition => ({ ...definition, items: tasks.filter(task => task.quadrant === definition.key) })),
      todayCount: tasks.filter(item => item.date === formatDate()).length,
      openTasks: tasks.filter(item => !item.done).length,
      completedCount: tasks.filter(item => item.done).length
    })
  },

  inputStudyTitle(e) { this.setData({ studyTitle: e.detail.value }) },
  inputSubject(e) { this.setData({ subject: e.detail.value }) },
  inputDetails(e) { this.setData({ details: e.detail.value }) },
  inputResult(e) { this.setData({ result: e.detail.value }) },
  changeStudyDate(e) { this.setData({ studyDate: e.detail.value }) },
  changeStartTime(e) { this.setData({ startTime: e.detail.value }) },
  changeEndTime(e) { this.setData({ endTime: e.detail.value }) },
  changeQuadrant(e) { this.setData({ quadrantIndex: Number(e.detail.value) }) },
  changeVisibility(e) { this.setData({ visibilityIndex: Number(e.detail.value) }) },
  changeStatus(e) { this.setData({ statusIndex: Number(e.detail.value) }) },

  async saveTask() {
    const title = this.data.studyTitle.trim()
    if (!title) { wx.showToast({ title: '先写下今天要学什么', icon: 'none' }); return }
    if (this.data.startTime && this.data.endTime && this.data.endTime <= this.data.startTime) {
      wx.showToast({ title: '结束时间需要晚于开始时间', icon: 'none' })
      return
    }
    const status = STATUS_OPTIONS[this.data.statusIndex]
    const existing = this.data.tasks.find(item => String(item.id) === this.data.editingId)
    const task = {
      ...(existing || {}), id: this.data.editingId || recordStore.createId(),
      date: this.data.studyDate, startTime: this.data.startTime, endTime: this.data.endTime,
      title, subject: this.data.subject.trim() || '自主学习',
      details: this.data.details.trim(), result: this.data.result.trim(),
      quadrant: quadrantDefinitions[this.data.quadrantIndex].key,
      visibility: this.data.visibilityOptions[this.data.visibilityIndex], status, done: status === '已完成'
    }
    const wasEditing = !!this.data.editingId
    const saved = await recordStore.put(COLLECTION, STORAGE_PREFIX, task)
    this.updateTasks(saved.records)
    this.resetForm(true)
    this.setData({ showComposer: false })
    wx.showToast({ title: saved.synced ? (wasEditing ? '学习记录已更新' : '今天的学习已记下') : '已保存在本机，稍后同步', icon: saved.synced ? 'success' : 'none' })
  },

  editTask(e) {
    const id = String(e.currentTarget.dataset.id)
    const task = this.data.tasks.find(item => String(item.id) === id)
    if (!task) return
    const times = defaultTimes()
    this.setData({
      editingId: id, studyDate: task.date || formatDate(), startTime: task.startTime || times.startTime, endTime: task.endTime || times.endTime,
      studyTitle: task.title, subject: task.subject, details: task.details, result: task.result,
      quadrantIndex: Math.max(0, quadrantDefinitions.findIndex(item => item.key === task.quadrant)),
      visibilityIndex: Math.max(0, this.data.visibilityOptions.indexOf(task.visibility)),
      statusIndex: Math.max(0, STATUS_OPTIONS.indexOf(task.status)), scrollTarget: '', showComposer: true
    }, () => this.setData({ scrollTarget: 'study-form' }))
  },
  cancelEdit() { this.resetForm(true); this.setData({ showComposer: false }) },
  openComposer() {
    if (!this.data.isLoggedIn) { this.goLogin(); return }
    this.resetForm(true)
    this.setData({ showComposer: true })
  },
  closeComposer() { this.cancelEdit() },
  noop() {},
  handleTimer() {
    if (!this.data.isLoggedIn) { this.goLogin(); return }
    this.toggleTimer()
  },
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
      title: '删除这条学习记录？', content: '学习内容和复盘也会一起删除，且无法恢复。',
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
      editingId: '', studyDate: keepDate && this.data.studyDate ? this.data.studyDate : formatDate(),
      startTime: times.startTime, endTime: times.endTime, studyTitle: '', subject: '', details: '', result: '',
      quadrantIndex: 1, visibilityIndex: 0, statusIndex: 1, scrollTarget: ''
    })
  },
  sharePlan() {
    const active = this.data.tasks.filter(item => !item.done)
    const shareableCount = active.filter(item => item.visibility === '可分享').length
    wx.setClipboardData({ data: `我的学习计划：还有 ${active.length} 项待完成，其中 ${shareableCount} 项可以分享。一起开始吧！`, success: () => wx.showToast({ title: '计划摘要已复制', icon: 'success' }) })
  },

  normalizeMinutes(value, fallback) {
    const parsed = String(value).trim() ? Number(value) : fallback
    return Math.min(180, Math.max(1, Number.isFinite(parsed) ? parsed : fallback))
  },
  changeFocusMinutes(e) {
    const focusMinutes = this.normalizeMinutes(e.detail.value, 25)
    wx.setStorageSync(this.settingsKey(), { focusMinutes, restMinutes: this.data.restMinutes, rounds: this.data.rounds })
    this.setData({ focusMinutes, ...(this.data.timerMode === 'focus' ? { remainingSeconds: focusMinutes * 60, timerText: formatTimer(focusMinutes * 60) } : {}) })
  },
  changeRestMinutes(e) {
    const restMinutes = this.normalizeMinutes(e.detail.value, 5)
    wx.setStorageSync(this.settingsKey(), { focusMinutes: this.data.focusMinutes, restMinutes, rounds: this.data.rounds })
    this.setData({ restMinutes, ...(this.data.timerMode === 'rest' ? { remainingSeconds: restMinutes * 60, timerText: formatTimer(restMinutes * 60) } : {}) })
  },
  toggleTimer() {
    if (this.data.timerRunning) {
      this.updateTimerFromClock()
      clearInterval(this.timer)
      this.timerEndAt = null
      this.setData({ timerRunning: false })
      return
    }
    this.timerEndAt = Date.now() + this.data.remainingSeconds * 1000
    this.setData({ timerRunning: true })
    this.startTicker()
  },
  startTicker() { clearInterval(this.timer); this.timer = setInterval(() => this.updateTimerFromClock(), 1000) },
  updateTimerFromClock() {
    if (!this.timerEndAt) return
    const next = Math.max(0, Math.ceil((this.timerEndAt - Date.now()) / 1000))
    if (next > 0) { this.setData({ remainingSeconds: next, timerText: formatTimer(next) }); return }
    clearInterval(this.timer)
    this.timerEndAt = null
    const finishedFocus = this.data.timerMode === 'focus'
    const timerMode = finishedFocus ? 'rest' : 'focus'
    const seconds = (finishedFocus ? this.data.restMinutes : this.data.focusMinutes) * 60
    const rounds = finishedFocus ? this.data.rounds + 1 : this.data.rounds
    this.setData({ timerMode, remainingSeconds: seconds, timerText: formatTimer(seconds), timerRunning: false, rounds })
    wx.setStorageSync(this.settingsKey(), { focusMinutes: this.data.focusMinutes, restMinutes: this.data.restMinutes, rounds })
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: finishedFocus ? '专注完成，休息一下' : '休息结束，继续学习', icon: 'none' })
  },
  resetTimer() {
    clearInterval(this.timer)
    this.timerEndAt = null
    const seconds = (this.data.timerMode === 'focus' ? this.data.focusMinutes : this.data.restMinutes) * 60
    this.setData({ remainingSeconds: seconds, timerText: formatTimer(seconds), timerRunning: false })
  },
  toggleWink() { this.setData({ wink: !this.data.wink }) }
})
