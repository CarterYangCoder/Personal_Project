const cloudData = require('../../utils/cloud-data')
Page({
  data: { redirect: '', nickname: '', avatarUrl: '' },
  onLoad(options) { this.setData({ redirect: decodeURIComponent(options.redirect || '') }) },
  chooseAvatar(e) { this.setData({ avatarUrl: e.detail.avatarUrl }) },
  inputNickname(e) { this.setData({ nickname: e.detail.value }) },
  async login() {
    if (!getApp().globalData.cloudEnabled) {
      wx.showModal({ title: '无法登录', content: '当前环境不支持微信云开发，请使用最新版微信打开。', showCancel: false })
      return
    }
    wx.showLoading({ title: '登录中', mask: true })
    try {
      const { openid } = await cloudData.login()
      let avatarUrl = this.data.avatarUrl
      if (avatarUrl) {
        try { avatarUrl = await cloudData.uploadAvatar(avatarUrl, openid) } catch (error) {}
      }
      const synced = await getApp().setProfile({
        openid,
        name: this.data.nickname.trim() || '夏日记录者',
        avatarUrl,
        school: '中国海洋大学 · 夏日同行者'
      })
      wx.hideLoading()
      wx.showToast({ title: synced ? '登录成功' : '已登录，资料稍后同步', icon: synced ? 'success' : 'none' })
      setTimeout(() => {
        if (this.data.redirect) wx.redirectTo({ url: this.data.redirect })
        else wx.navigateBack({ delta: 1 })
      }, 450)
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  },
  back() { wx.navigateBack({ delta: 1 }) }
})
