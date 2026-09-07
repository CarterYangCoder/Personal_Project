const quadrantDefinitions = [
  { key: 'important-urgent', index: 'I', name: '重要且紧急', tone: 'red' },
  { key: 'important', index: 'II', name: '重要不紧急', tone: 'blue' },
  { key: 'urgent', index: 'III', name: '紧急不重要', tone: 'orange' },
  { key: 'later', index: 'IV', name: '不重要不紧急', tone: 'green' }
]
const recordStore = require('../../utils/record-store')
const COLLECTION = 'studyTasks'
const STORAGE_PREFIX = 'summerQuadrantTasks'

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}

Page({
  data: {
    wink: false, tasks: [], quadrants: [], quadrantNames: quadrantDefinitions.map(item => item.name), quadrantIndex: 0,
    visibilityOptions: ['私密', '可分享'], visibilityIndex: 0, focusMinutes: 25, restMinutes: 5,
    remainingSeconds: 1500, timerText: '25:00', timerMode: 'focus', timerRunning: false, rounds: 0, isLoggedIn: false
  },
  onShow() { this.refreshLoginState() },
  refreshLoginState() {
    const isLoggedIn = !!getApp().globalData.profile
    this.setData({ isLoggedIn })
    if (!isLoggedIn) {
      clearInterval(this.timer)
      this.timerEndAt = null
      this.setData({ tasks: [], quadrants: [], timerRunning: false, timerMode: 'focus', rounds: 0, remainingSeconds: 1500, timerText: '25:00' })
      return
    }
    const storedTasks = recordStore.read(STORAGE_PREFIX)
    const tasks = storedTasks.map(item => item.visibility === '公开' ? { ...item, visibility: '可分享' } : item)
    if (storedTasks.some(item => item.visibility === '公开')) recordStore.write(STORAGE_PREFIX, tasks)
    const settings = wx.getStorageSync(this.settingsKey()) || {}
    const focusMinutes = Number(settings.focusMinutes) || 25
    const restMinutes = Number(settings.restMinutes) || 5
    const timerMinutes = this.data.timerMode === 'focus' ? focusMinutes : restMinutes
    this.setData({
      tasks, focusMinutes, restMinutes, rounds: Number(settings.rounds) || this.data.rounds,
      ...(!this.data.timerRunning ? { remainingSeconds: timerMinutes * 60, timerText: formatTime(timerMinutes * 60) } : {})
    })
    this.syncQuadrants(tasks)
    recordStore.sync(COLLECTION, STORAGE_PREFIX).then(records => {
      if (getApp().globalData.profile) this.syncQuadrants(records)
    })
    if (this.data.timerRunning && this.timerEndAt) this.startTicker()
  },
  goLogin() { getApp().requireLogin('/pages/study/study') },
  onHide() { clearInterval(this.timer) },
  onUnload() { clearInterval(this.timer) },
  settingsKey() { const profile = getApp().globalData.profile; return `summerPomodoroSettings:${profile.openid || profile.name}` },
  syncQuadrants(tasks = this.data.tasks) {
    const quadrants = quadrantDefinitions.map(definition => ({ ...definition, items: tasks.filter(task => task.quadrant === definition.key) }))
    this.setData({ tasks, quadrants })
  },
  changeQuadrant(e) { this.setData({ quadrantIndex: Number(e.detail.value) }) },
  changeVisibility(e) { this.setData({ visibilityIndex: Number(e.detail.value) }) },
  async addTask(e) {
    const title = (e.detail.value.title || '').trim()
    if (!title) { wx.showToast({ title: '先写下计划内容', icon: 'none' }); return }
    const task = { id: recordStore.createId(), title, quadrant: quadrantDefinitions[this.data.quadrantIndex].key, visibility: this.data.visibilityOptions[this.data.visibilityIndex], done: false }
    const result = await recordStore.put(COLLECTION, STORAGE_PREFIX, task)
    this.syncQuadrants(result.records)
    wx.showToast({ title: result.synced ? '已加入计划' : '已保存在本机，稍后同步', icon: result.synced ? 'success' : 'none' })
  },
  deleteTask(e) {
    const id = String(e.currentTarget.dataset.id)
    wx.showModal({ title: '删除这项计划？', content: '删除后无法恢复。', success: async result => {
      if (!result.confirm) return
      const removed = await recordStore.remove(COLLECTION, STORAGE_PREFIX, id)
      this.syncQuadrants(removed.records)
    } })
  },
  async toggleTask(e) {
    const id = String(e.currentTarget.dataset.id)
    const task = this.data.tasks.find(item => String(item.id) === id)
    if (!task) return
    const result = await recordStore.put(COLLECTION, STORAGE_PREFIX, { ...task, done: !task.done })
    this.syncQuadrants(result.records)
  },
  sharePlan() {
    const active = this.data.tasks.filter(item => !item.done)
    const shareableCount = active.filter(item => item.visibility === '可分享').length
    const text = `我的暑期计划：还有 ${active.length} 项待完成，其中 ${shareableCount} 项可分享计划。一起开始吧！`
    wx.setClipboardData({ data: text, success: () => wx.showToast({ title: '计划摘要已复制', icon: 'success' }) })
  },
  normalizeMinutes(value, fallback) { const parsed = String(value).trim() ? Number(value) : fallback; return Math.min(180, Math.max(1, Number.isFinite(parsed) ? parsed : fallback)) },
  changeFocusMinutes(e) {
    const focusMinutes = this.normalizeMinutes(e.detail.value, 25)
    const next = { focusMinutes, restMinutes: this.data.restMinutes, rounds: this.data.rounds }
    wx.setStorageSync(this.settingsKey(), next)
    this.setData({ focusMinutes, ...(this.data.timerMode === 'focus' ? { remainingSeconds: focusMinutes * 60, timerText: formatTime(focusMinutes * 60) } : {}) })
  },
  changeRestMinutes(e) {
    const restMinutes = this.normalizeMinutes(e.detail.value, 5)
    wx.setStorageSync(this.settingsKey(), { focusMinutes: this.data.focusMinutes, restMinutes, rounds: this.data.rounds })
    this.setData({ restMinutes, ...(this.data.timerMode === 'rest' ? { remainingSeconds: restMinutes * 60, timerText: formatTime(restMinutes * 60) } : {}) })
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
  startTicker() {
    clearInterval(this.timer)
    this.timer = setInterval(() => {
      this.updateTimerFromClock()
    }, 1000)
  },
  updateTimerFromClock() {
    if (!this.timerEndAt) return
    const next = Math.max(0, Math.ceil((this.timerEndAt - Date.now()) / 1000))
    if (next > 0) { this.setData({ remainingSeconds: next, timerText: formatTime(next) }); return }
    clearInterval(this.timer)
    this.timerEndAt = null
    const finishedFocus = this.data.timerMode === 'focus'
    const timerMode = finishedFocus ? 'rest' : 'focus'
    const seconds = (finishedFocus ? this.data.restMinutes : this.data.focusMinutes) * 60
    const rounds = finishedFocus ? this.data.rounds + 1 : this.data.rounds
    this.setData({ timerMode, remainingSeconds: seconds, timerText: formatTime(seconds), timerRunning: false, rounds })
    wx.setStorageSync(this.settingsKey(), { focusMinutes: this.data.focusMinutes, restMinutes: this.data.restMinutes, rounds })
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: finishedFocus ? '专注完成，休息一下' : '休息结束，继续学习', icon: 'none' })
  },
  resetTimer() {
    clearInterval(this.timer)
    this.timerEndAt = null
    const seconds = (this.data.timerMode === 'focus' ? this.data.focusMinutes : this.data.restMinutes) * 60
    this.setData({ remainingSeconds: seconds, timerText: formatTime(seconds), timerRunning: false })
  },
  toggleWink() { this.setData({ wink: !this.data.wink }) },
  backHome() { wx.navigateBack({ delta: 1 }) }
})
