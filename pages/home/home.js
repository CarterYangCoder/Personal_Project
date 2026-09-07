const { timeline, quickLinks } = require('../../data/summer')
const recordStore = require('../../utils/record-store')
const cloudData = require('../../utils/cloud-data')

const recordSources = [
  ['workTasks', 'summerWorkTasks'],
  ['studyTasks', 'summerQuadrantTasks'],
  ['diaries', 'summerDiaries'],
  ['volunteerIntents', 'summerVolunteerIntents']
]
Page({
  data: { timeline, quickLinks, refreshed: false, activeTab: 'home', profile: null, isLoggedIn: false, avatarText: '未', dashboard: { work: 0, study: 0, diary: 0, volunteer: 0 } },
  onShow() {
    const profile = getApp().globalData.profile
    this.setData({ profile, isLoggedIn: !!profile, avatarText: profile ? (profile.initial || profile.name.slice(0, 1)) : '未' })
    this.refreshDashboard(false)
  },
  async refreshDashboard(syncCloud) {
    if (syncCloud && getApp().globalData.profile) {
      await Promise.all(recordSources.map(([collection, prefix]) => recordStore.sync(collection, prefix)))
    }
    const dashboard = getApp().globalData.profile ? {
      work: recordStore.read('summerWorkTasks').filter(item => !item.done).length,
      study: recordStore.read('summerQuadrantTasks').filter(item => !item.done).length,
      diary: recordStore.read('summerDiaries').length,
      volunteer: recordStore.read('summerVolunteerIntents').length
    } : { work: 0, study: 0, diary: 0, volunteer: 0 }
    this.setData({ dashboard })
  },
  async onPullDownRefresh() {
    this.setData({ refreshed: true })
    await this.refreshDashboard(true)
    wx.stopPullDownRefresh()
    wx.showToast({ title: cloudData.cloudReady() ? '记录已同步' : '已刷新本机记录', icon: 'none' })
  },
  goLogin() { wx.navigateTo({ url: '/pages/login/login' }) },
  switchTab(e) { this.setData({ activeTab: e.currentTarget.dataset.tab }) },
  goModule(e) { wx.navigateTo({ url: e.currentTarget.dataset.page }) },
  openAssistant() { wx.navigateTo({ url: '/pages/assistant/assistant' }) },
  openProfile() { if (this.data.isLoggedIn) wx.navigateTo({ url: '/pages/profile/profile' }) },
  logout() { wx.showModal({ title: '确认退出登录？', content: '退出后将无法查看或使用个人记录、计划和报名内容。', success: result => { if (result.confirm) { getApp().logout(); this.setData({ profile: null, isLoggedIn: false, avatarText: '未', dashboard: { work: 0, study: 0, diary: 0, volunteer: 0 } }); wx.showToast({ title: '已退出登录', icon: 'none' }) } } }) }
})
