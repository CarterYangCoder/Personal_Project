Component({
  properties: { item: { type: Object, value: {} } },
  methods: {
    // 功能页保留公共介绍；页面内的个人数据区会根据登录态自行解锁。
    go() { const { page } = this.properties.item; if (page) wx.navigateTo({ url: page }) }
  }
})
