const { homePlans, homeModules } = require('../../utils/mock')
const recordStore = require('../../utils/record-store')
const cloudData = require('../../utils/cloud-data')

const recordSources = [
  ['workTasks', 'summerWorkTasks'],
  ['studyTasks', 'summerQuadrantTasks'],
  ['diaries', 'summerDiaries'],
  ['volunteerIntents', 'summerVolunteerIntents']
]

function dateCopy() {
  const now = new Date()
  const hour = now.getHours()
  return {
    greeting: `${hour < 11 ? '早上好' : hour < 18 ? '下午好' : '晚上好'}，小夏`,
    heroSubtitle: `${now.getMonth() + 1}月${now.getDate()}日　星期${'日一二三四五六'[now.getDay()]}\n在这个夏天，成为更好的自己`
  }
}

Page({
  data: {
    ...dateCopy(),
    homePlans,
    homeModules,
    profile: null,
    isLoggedIn: false,
    dashboard: { work: 0, study: 0, diary: 0, volunteer: 0 },
    refreshing: false
  },
  onShow() {
    const profile = getApp().globalData.profile
    this.setData({ ...dateCopy(), profile, isLoggedIn: !!profile })
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
  async refresh() {
    this.setData({ refreshing: true })
    try {
      await this.refreshDashboard(true)
      wx.showToast({ title: cloudData.cloudReady() ? '记录已同步' : '已刷新本机记录', icon: 'none' })
    } finally {
      this.setData({ refreshing: false })
    }
  },
  goModule(e) { wx.navigateTo({ url: e.currentTarget.dataset.page }) },
  openAssistant() { wx.navigateTo({ url: '/pages/assistant/assistant' }) }
})
