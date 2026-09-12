const { volunteerProjects } = require('../../utils/mock')
const recordStore = require('../../utils/record-store')

const COLLECTION = 'volunteerIntents'
const STORAGE_PREFIX = 'summerVolunteerIntents'

Page({
  data: {
    projects: volunteerProjects,
    displayProjects: volunteerProjects,
    categories: ['全部', '环保', '支教', '社区', '关爱'],
    activeCategory: '全部',
    projectNames: volunteerProjects.map(item => item.name),
    projectIndex: 0,
    activeId: null,
    intents: [],
    isLoggedIn: false,
    showIntent: false
  },
  onShow() { this.refreshLoginState() },
  refreshLoginState() {
    const isLoggedIn = !!getApp().globalData.profile
    this.setData({ isLoggedIn, intents: isLoggedIn ? recordStore.read(STORAGE_PREFIX) : [] })
    if (isLoggedIn) recordStore.sync(COLLECTION, STORAGE_PREFIX).then(intents => this.setData({ intents }))
  },
  goLogin() { getApp().requireLogin('/pages/volunteer/volunteer') },
  toggleProject(e) { const id = e.currentTarget.dataset.id; this.setData({ activeId: this.data.activeId === id ? null : id }) },
  changeCategory(e) {
    const activeCategory = e.currentTarget.dataset.category
    this.setData({ activeCategory, displayProjects: activeCategory === '全部' ? this.data.projects : this.data.projects.filter(item => item.type === activeCategory) })
  },
  openIntent(e) {
    if (!this.data.isLoggedIn) { this.goLogin(); return }
    const id = Number(e.currentTarget.dataset.id)
    const projectIndex = Math.max(0, this.data.projects.findIndex(item => item.id === id))
    this.setData({ projectIndex, showIntent: true })
  },
  closeIntent() { this.setData({ showIntent: false }) },
  noop() {},
  changeProject(e) { this.setData({ projectIndex: Number(e.detail.value) }) },
  async submitIntent(e) {
    const name = (e.detail.value.name || '').trim()
    const message = (e.detail.value.message || '').trim()
    if (!name || !message) { wx.showToast({ title: '请填写称呼和参与想法', icon: 'none' }); return }
    const now = new Date()
    const intent = { id: recordStore.createId(), name, message, project: this.data.projectNames[this.data.projectIndex], createdAt: `${now.getMonth() + 1}月${now.getDate()}日`, status: '已提交' }
    const result = await recordStore.put(COLLECTION, STORAGE_PREFIX, intent)
    this.setData({ intents: result.records, showIntent: false })
    wx.showToast({ title: result.synced ? '参与意向已提交' : '已保存在本机，稍后同步', icon: result.synced ? 'success' : 'none' })
  },
  deleteIntent(e) {
    const id = String(e.currentTarget.dataset.id)
    wx.showModal({ title: '撤回这条参与意向？', content: '撤回后，发起人将无法再看到这条意向。', success: async result => {
      if (!result.confirm) return
      const removed = await recordStore.remove(COLLECTION, STORAGE_PREFIX, id)
      this.setData({ intents: removed.records })
    } })
  },
  copyContactWord() { wx.setClipboardData({ data: '公益一起做-杨思睿' }) },
  backHome() { wx.navigateBack({ delta: 1 }) }
})
