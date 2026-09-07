const recordStore = require('../../utils/record-store')

const COLLECTION = 'workTasks'
const STORAGE_PREFIX = 'summerWorkTasks'

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
    tasks: [],
    openTasks: 0,
    isLoggedIn: false
  },
  onShow() { this.refreshLoginState() },
  refreshLoginState() {
    const isLoggedIn = !!getApp().globalData.profile
    this.setData({ isLoggedIn, tasks: isLoggedIn ? this.data.tasks : [], openTasks: isLoggedIn ? this.data.openTasks : 0 })
    if (isLoggedIn) this.loadTasks()
  },
  goLogin() { getApp().requireLogin('/pages/work/work') },
  loadTasks() {
    const tasks = recordStore.read(STORAGE_PREFIX)
    this.updateTasks(tasks)
    recordStore.sync(COLLECTION, STORAGE_PREFIX).then(records => {
      if (getApp().globalData.profile) this.updateTasks(records)
    })
  },
  updateTasks(tasks) { this.setData({ tasks, openTasks: tasks.filter(item => !item.done).length }) },
  async addTask(e) {
    const title = (e.detail.value.title || '').trim()
    if (!title) { wx.showToast({ title: '先写下一项事务', icon: 'none' }); return }
    const task = { id: recordStore.createId(), title, done: false }
    const result = await recordStore.put(COLLECTION, STORAGE_PREFIX, task)
    this.updateTasks(result.records)
    wx.showToast({ title: result.synced ? '已加入工作看板' : '已保存在本机，稍后同步', icon: result.synced ? 'success' : 'none' })
  },
  async toggleTask(e) {
    const id = String(e.currentTarget.dataset.id)
    const task = this.data.tasks.find(item => String(item.id) === id)
    if (!task) return
    const result = await recordStore.put(COLLECTION, STORAGE_PREFIX, { ...task, done: !task.done })
    this.updateTasks(result.records)
  },
  deleteTask(e) {
    const id = String(e.currentTarget.dataset.id)
    wx.showModal({
      title: '删除这项待办？',
      content: '删除后无法恢复。',
      success: async result => {
        if (!result.confirm) return
        const removed = await recordStore.remove(COLLECTION, STORAGE_PREFIX, id)
        this.updateTasks(removed.records)
        wx.showToast({ title: removed.synced ? '已删除' : '已在本机删除，稍后同步', icon: 'none' })
      }
    })
  },
  backHome() { wx.navigateBack({ delta: 1 }) }
})
