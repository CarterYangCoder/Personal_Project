const cloudData = require('../../utils/cloud-data')

Page({
  data: { nickname: '', avatarUrl: '' },
  onLoad() { const profile = getApp().globalData.profile; if (!profile) { wx.redirectTo({ url: '/pages/login/login' }); return }; this.setData({ nickname: profile.name, avatarUrl: profile.avatarUrl || '' }) },
  chooseAvatar(e) { this.setData({ avatarUrl: e.detail.avatarUrl }) },
  inputNickname(e) { this.setData({ nickname: e.detail.value }) },
  async save() {
    const current = getApp().globalData.profile
    const name = this.data.nickname.trim() || '夏日记录者'
    wx.showLoading({ title: '保存中', mask: true })
    let avatarUrl = this.data.avatarUrl
    if (avatarUrl && avatarUrl !== current.avatarUrl) {
      try { avatarUrl = await cloudData.uploadAvatar(avatarUrl, current.openid) } catch (error) {}
    }
    const synced = await getApp().setProfile({ ...current, name, avatarUrl })
    wx.hideLoading()
    wx.showToast({ title: synced ? '资料已保存' : '已保存在本机，稍后同步', icon: synced ? 'success' : 'none' })
    setTimeout(() => wx.navigateBack(), 500)
  },
  back() { wx.navigateBack() }
})
