Page({
  data: { leaving: false },
  onLoad() {
    const app = getApp()
    if (app.globalData.coverSeen) { wx.redirectTo({ url: '/pages/home/home' }); return }
    app.globalData.coverSeen = true
    this.timer = setTimeout(() => this.enter(), 1200)
  },
  onUnload() { clearTimeout(this.timer); clearTimeout(this.redirectTimer) },
  enter() {
    if (this.data.leaving) return
    this.setData({ leaving: true })
    this.redirectTimer = setTimeout(() => wx.redirectTo({ url: '/pages/home/home' }), 260)
  }
})
