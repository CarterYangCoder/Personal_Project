Component({
  properties: { items: { type: Array, value: [] } },
  methods: {
    openItem(e) {
      const { page } = e.currentTarget.dataset
      if (page && getApp().requireLogin(page)) wx.navigateTo({ url: page })
    }
  }
})
