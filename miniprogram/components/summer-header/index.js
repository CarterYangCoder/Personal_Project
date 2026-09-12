Component({
  properties: {
    title: { type: String, value: '' },
    subtitle: { type: String, value: '' },
    back: { type: Boolean, value: false },
    compact: { type: Boolean, value: false }
  },
  data: { statusTop: 24 },
  lifetimes: {
    attached() {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      this.setData({ statusTop: info.statusBarHeight || 24 })
    }
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) wx.navigateBack({ delta: 1 })
      else wx.reLaunch({ url: '/pages/home/home' })
    }
  }
})
