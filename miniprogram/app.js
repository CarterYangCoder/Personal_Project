const { envId } = require('./cloud-config')
const cloudData = require('./utils/cloud-data')

App({
  globalData: { profile: null, cloudEnabled: false, coverSeen: false },
  onLaunch() {
    const profile = wx.getStorageSync('summerUserProfile')
    this.globalData.profile = profile && profile.openid && typeof profile.name === 'string' ? profile : null
    if (wx.cloud && envId) {
      try {
        wx.cloud.init({ env: envId, traceUser: true })
        this.globalData.cloudEnabled = true
      } catch (error) {
        this.globalData.cloudEnabled = false
      }
    }
  },
  async setProfile(profile) {
    const name = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : '夏日记录者'
    this.globalData.profile = { ...profile, name, initial: name.slice(0, 1) }
    wx.setStorageSync('summerUserProfile', this.globalData.profile)
    if (!this.globalData.cloudEnabled) return false
    try {
      await cloudData.upsertProfile(this.globalData.profile)
      return true
    } catch (error) {
      return false
    }
  },
  logout() { this.globalData.profile = null; wx.removeStorageSync('summerUserProfile') },
  requireLogin(redirect = '') {
    if (this.globalData.profile) return true
    wx.showModal({ title: '登录后即可使用', content: '登录后可以保存计划、记录日记并提交公益参与意向。', confirmText: '去登录', success: result => { if (result.confirm) wx.navigateTo({ url: `/pages/login/login?redirect=${encodeURIComponent(redirect)}` }) } })
    return false
  }
})
