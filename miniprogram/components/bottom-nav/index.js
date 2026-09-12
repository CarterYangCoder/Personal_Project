const items = [
  { key: 'home', label: '首页', page: '/pages/home/home', icon: '/assets/icons/tab-home.png', activeIcon: '/assets/icons/tab-home-active.png' },
  { key: 'record', label: '记录', page: '/pages/work/work', icon: '/assets/icons/tab-record.png', activeIcon: '/assets/icons/tab-record-active.png' },
  { key: 'volunteer', label: '公益', page: '/pages/volunteer/volunteer', icon: '/assets/icons/tab-heart.png', activeIcon: '/assets/icons/tab-heart-active.png' },
  { key: 'profile', label: '我的', page: '/pages/profile/profile', icon: '/assets/icons/tab-user.png', activeIcon: '/assets/icons/tab-user-active.png' }
]
Component({
  properties: { selected: { type: String, value: 'home' } },
  data: { items },
  methods: {
    go(e) {
      const item = items.find(entry => entry.key === e.currentTarget.dataset.key)
      if (!item || item.key === this.data.selected) return
      if (item.key === 'profile' && !getApp().globalData.profile) {
        getApp().requireLogin(item.page)
        return
      }
      wx.redirectTo({ url: item.page, fail: () => wx.reLaunch({ url: item.page }) })
    }
  }
})
