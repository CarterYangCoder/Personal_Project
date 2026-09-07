const songs = [
  { title: '稻香', artist: '周杰伦', note: '累的时候，记得回到让自己安心的地方。' },
  { title: '平凡之路', artist: '朴树', note: '在平凡的日子里，也可以一直向前。' },
  { title: '这世界那么多人', artist: '莫文蔚', note: '感谢那些在生活里与我们相遇的人。' },
  { title: '夜空中最亮的星', artist: '逃跑计划', note: '迷路的时候，给自己留一点光。' },
  { title: '有我', artist: '周深', note: '愿意行动的人，本身就是答案的一部分。' }
]
const recordStore = require('../../utils/record-store')
const DIARY_COLLECTION = 'diaries'
const DIARY_PREFIX = 'summerDiaries'
const FAVORITE_COLLECTION = 'favoriteSongs'
const FAVORITE_PREFIX = 'summerFavoriteSongs'

function formatDate(date) {
  const pad = value => value.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

Page({
  data: {
    songs, songIndex: 0, currentSong: songs[0], todayLabel: '', diaries: [], diaryDate: '',
    moods: ['🙂 平静', '😄 开心', '🥹 感动', '😴 疲惫', '🌊 放空'], moodIndex: 0,
    diaryTitle: '', diaryContent: '', diaryImportant: false, favoriteSongs: [], isCurrentFavorite: false, isLoggedIn: false
  },
  onLoad() {
    const isLoggedIn = !!getApp().globalData.profile
    this.setData({ isLoggedIn })
    const today = new Date()
    const songIndex = (today.getFullYear() + today.getMonth() + today.getDate()) % songs.length
    const rawFavorites = isLoggedIn ? recordStore.read(FAVORITE_PREFIX) : []
    const favoriteRecords = rawFavorites.map(item => {
      if (typeof item !== 'string') return item
      const clientId = `song-${songs.findIndex(song => song.title === item)}`
      return { id: clientId, clientId, title: item }
    })
    if (isLoggedIn && rawFavorites.some(item => typeof item === 'string')) recordStore.write(FAVORITE_PREFIX, favoriteRecords)
    const favoriteSongs = favoriteRecords.map(item => item.title).filter(Boolean)
    this.setData({ songIndex, currentSong: songs[songIndex], todayLabel: `${today.getMonth() + 1}月${today.getDate()}日`, diaryDate: formatDate(today), diaries: isLoggedIn ? recordStore.read(DIARY_PREFIX) : [], favoriteSongs, isCurrentFavorite: favoriteSongs.includes(songs[songIndex].title) })
  },
  onShow() {
    if (!!getApp().globalData.profile !== this.data.isLoggedIn) this.onLoad()
    if (getApp().globalData.profile) this.syncRecords()
  },
  goLogin() { getApp().requireLogin('/pages/daily/daily') },
  async syncRecords() {
    const [diaries, favoriteRecords] = await Promise.all([
      recordStore.sync(DIARY_COLLECTION, DIARY_PREFIX),
      recordStore.sync(FAVORITE_COLLECTION, FAVORITE_PREFIX)
    ])
    const favoriteSongs = favoriteRecords.map(item => typeof item === 'string' ? item : item.title).filter(Boolean)
    this.setData({ diaries, favoriteSongs, isCurrentFavorite: favoriteSongs.includes(this.data.currentSong.title) })
  },
  async toggleFavorite() {
    const { favoriteSongs, currentSong } = this.data
    const exists = favoriteSongs.includes(currentSong.title)
    const clientId = `song-${songs.findIndex(item => item.title === currentSong.title)}`
    const result = exists
      ? await recordStore.remove(FAVORITE_COLLECTION, FAVORITE_PREFIX, clientId)
      : await recordStore.put(FAVORITE_COLLECTION, FAVORITE_PREFIX, { id: clientId, title: currentSong.title })
    const next = result.records.map(item => typeof item === 'string' ? item : item.title).filter(Boolean)
    this.setData({ favoriteSongs: next, isCurrentFavorite: !exists })
    wx.showToast({ title: exists ? '已移出收藏' : '已收藏今日一歌', icon: 'none' })
  },
  nextSong() { const songIndex = (this.data.songIndex + 1) % songs.length; this.setData({ songIndex, currentSong: songs[songIndex], isCurrentFavorite: this.data.favoriteSongs.includes(songs[songIndex].title) }) },
  changeDiaryDate(e) { this.setData({ diaryDate: e.detail.value }) },
  changeMood(e) { this.setData({ moodIndex: Number(e.detail.value) }) },
  changeImportant(e) { this.setData({ diaryImportant: e.detail.value }) },
  inputDiaryTitle(e) { this.setData({ diaryTitle: e.detail.value }) },
  inputDiaryContent(e) { this.setData({ diaryContent: e.detail.value }) },
  async saveDiary() {
    const title = this.data.diaryTitle.trim()
    const content = this.data.diaryContent.trim()
    if (!title || !content) { wx.showToast({ title: '请写下标题和内容', icon: 'none' }); return }
    const diary = { id: recordStore.createId(), date: this.data.diaryDate, title, content, mood: this.data.moods[this.data.moodIndex], important: this.data.diaryImportant }
    const result = await recordStore.put(DIARY_COLLECTION, DIARY_PREFIX, diary)
    this.setData({ diaries: result.records, diaryTitle: '', diaryContent: '', diaryImportant: false })
    wx.showToast({ title: result.synced ? '今天已保存' : '已保存在本机，稍后同步', icon: result.synced ? 'success' : 'none' })
  },
  deleteDiary(e) {
    const id = String(e.currentTarget.dataset.id)
    wx.showModal({ title: '删除这篇日记？', content: '删除后无法恢复，请确认是否继续。', success: async result => {
      if (!result.confirm) return
      const removed = await recordStore.remove(DIARY_COLLECTION, DIARY_PREFIX, id)
      this.setData({ diaries: removed.records })
    } })
  },
  backHome() { wx.navigateBack({ delta: 1 }) }
})
