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

function pad(value) { return String(value).padStart(2, '0') }
function formatDate(date = new Date()) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
function formatClock(date = new Date()) { return `${pad(date.getHours())}:${pad(date.getMinutes())}` }
function dateLabel(value) {
  if (!value) return '早期生活记录'
  const parts = value.split('-').map(Number)
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const prefix = value === formatDate() ? '今天' : value === formatDate(yesterday) ? '昨天' : `${parts[1]}月${parts[2]}日`
  return `${prefix} · ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]}`
}
function normalizeDiary(diary) {
  return {
    ...diary, date: diary.date || '', time: diary.time || '', category: diary.category || '生活片段',
    mood: diary.mood || '🙂 平静', title: diary.title || '未命名记录', content: diary.content || '',
    important: !!diary.important, timeLabel: diary.time || '未填写时间'
  }
}

Page({
  data: {
    songs, songIndex: 0, currentSong: songs[0], todayLabel: '', isLoggedIn: false,
    diaries: [], diaryGroups: [], todayCount: 0, importantCount: 0,
    moods: ['🙂 平静', '😄 开心', '🥹 感动', '😴 疲惫', '🌊 放空'], moodIndex: 0,
    diaryDate: '', diaryTime: '', diaryCategory: '', diaryTitle: '', diaryContent: '', diaryImportant: false,
    editingId: '', scrollTarget: '', favoriteSongs: [], isCurrentFavorite: false
  },

  onLoad() {
    const today = new Date()
    const songIndex = (today.getFullYear() + today.getMonth() + today.getDate()) % songs.length
    this.setData({ songIndex, currentSong: songs[songIndex], todayLabel: `${today.getMonth() + 1}月${today.getDate()}日` })
    this.resetForm()
  },
  onShow() { this.refreshLoginState() },
  refreshLoginState() {
    const isLoggedIn = !!getApp().globalData.profile
    this.setData({ isLoggedIn })
    if (!isLoggedIn) { this.updateDiaries([]); this.setData({ favoriteSongs: [], isCurrentFavorite: false }); return }
    const rawFavorites = recordStore.read(FAVORITE_PREFIX)
    const favoriteRecords = rawFavorites.map(item => {
      if (typeof item !== 'string') return item
      const clientId = `song-${songs.findIndex(song => song.title === item)}`
      return { id: clientId, clientId, title: item }
    })
    if (rawFavorites.some(item => typeof item === 'string')) recordStore.write(FAVORITE_PREFIX, favoriteRecords)
    const favoriteSongs = favoriteRecords.map(item => item.title).filter(Boolean)
    this.updateDiaries(recordStore.read(DIARY_PREFIX))
    this.setData({ favoriteSongs, isCurrentFavorite: favoriteSongs.includes(this.data.currentSong.title) })
    this.syncRecords()
  },
  goLogin() { getApp().requireLogin('/pages/daily/daily') },
  updateDiaries(records) {
    const diaries = records.map(normalizeDiary).sort((a, b) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '')
      return dateCompare || (b.time || '').localeCompare(a.time || '')
    })
    const groupMap = new Map()
    diaries.forEach(diary => {
      const key = diary.date || 'legacy'
      if (!groupMap.has(key)) groupMap.set(key, { date: key, label: dateLabel(diary.date), items: [] })
      groupMap.get(key).items.push(diary)
    })
    this.setData({ diaries, diaryGroups: Array.from(groupMap.values()), todayCount: diaries.filter(item => item.date === formatDate()).length, importantCount: diaries.filter(item => item.important).length })
  },
  async syncRecords() {
    const [diaries, favoriteRecords] = await Promise.all([
      recordStore.sync(DIARY_COLLECTION, DIARY_PREFIX), recordStore.sync(FAVORITE_COLLECTION, FAVORITE_PREFIX)
    ])
    if (!getApp().globalData.profile) return
    const favoriteSongs = favoriteRecords.map(item => typeof item === 'string' ? item : item.title).filter(Boolean)
    this.updateDiaries(diaries)
    this.setData({ favoriteSongs, isCurrentFavorite: favoriteSongs.includes(this.data.currentSong.title) })
  },
  async toggleFavorite() {
    const { favoriteSongs, currentSong } = this.data
    const exists = favoriteSongs.includes(currentSong.title)
    const clientId = `song-${songs.findIndex(item => item.title === currentSong.title)}`
    const result = exists ? await recordStore.remove(FAVORITE_COLLECTION, FAVORITE_PREFIX, clientId) : await recordStore.put(FAVORITE_COLLECTION, FAVORITE_PREFIX, { id: clientId, title: currentSong.title })
    const next = result.records.map(item => typeof item === 'string' ? item : item.title).filter(Boolean)
    this.setData({ favoriteSongs: next, isCurrentFavorite: !exists })
    wx.showToast({ title: exists ? '已移出收藏' : '已收藏今日一歌', icon: 'none' })
  },
  nextSong() {
    const songIndex = (this.data.songIndex + 1) % songs.length
    this.setData({ songIndex, currentSong: songs[songIndex], isCurrentFavorite: this.data.favoriteSongs.includes(songs[songIndex].title) })
  },

  changeDiaryDate(e) { this.setData({ diaryDate: e.detail.value }) },
  changeDiaryTime(e) { this.setData({ diaryTime: e.detail.value }) },
  changeMood(e) { this.setData({ moodIndex: Number(e.detail.value) }) },
  changeImportant(e) { this.setData({ diaryImportant: e.detail.value }) },
  inputDiaryCategory(e) { this.setData({ diaryCategory: e.detail.value }) },
  inputDiaryTitle(e) { this.setData({ diaryTitle: e.detail.value }) },
  inputDiaryContent(e) { this.setData({ diaryContent: e.detail.value }) },
  async saveDiary() {
    const title = this.data.diaryTitle.trim()
    const content = this.data.diaryContent.trim()
    if (!title || !content) { wx.showToast({ title: '请写下标题和内容', icon: 'none' }); return }
    const existing = this.data.diaries.find(item => String(item.id) === this.data.editingId)
    const diary = {
      ...(existing || {}), id: this.data.editingId || recordStore.createId(), date: this.data.diaryDate, time: this.data.diaryTime,
      category: this.data.diaryCategory.trim() || '生活片段', title, content, mood: this.data.moods[this.data.moodIndex], important: this.data.diaryImportant
    }
    const wasEditing = !!this.data.editingId
    const result = await recordStore.put(DIARY_COLLECTION, DIARY_PREFIX, diary)
    this.updateDiaries(result.records)
    this.resetForm(true)
    wx.showToast({ title: result.synced ? (wasEditing ? '生活记录已更新' : '今天已保存') : '已保存在本机，稍后同步', icon: result.synced ? 'success' : 'none' })
  },
  editDiary(e) {
    const id = String(e.currentTarget.dataset.id)
    const diary = this.data.diaries.find(item => String(item.id) === id)
    if (!diary) return
    this.setData({
      editingId: id, diaryDate: diary.date || formatDate(), diaryTime: diary.time || formatClock(), diaryCategory: diary.category,
      diaryTitle: diary.title, diaryContent: diary.content, diaryImportant: diary.important,
      moodIndex: Math.max(0, this.data.moods.indexOf(diary.mood)), scrollTarget: ''
    }, () => this.setData({ scrollTarget: 'diary-form' }))
  },
  cancelEdit() { this.resetForm(true) },
  deleteDiary(e) {
    const id = String(e.currentTarget.dataset.id)
    wx.showModal({ title: '删除这条生活记录？', content: '记录删除后无法恢复，请确认是否继续。', success: async result => {
      if (!result.confirm) return
      const removed = await recordStore.remove(DIARY_COLLECTION, DIARY_PREFIX, id)
      this.updateDiaries(removed.records)
      if (this.data.editingId === id) this.resetForm(true)
      wx.showToast({ title: removed.synced ? '记录已删除' : '已在本机删除，稍后同步', icon: 'none' })
    } })
  },
  resetForm(keepDate = false) {
    this.setData({
      editingId: '', diaryDate: keepDate && this.data.diaryDate ? this.data.diaryDate : formatDate(), diaryTime: formatClock(),
      diaryCategory: '', diaryTitle: '', diaryContent: '', diaryImportant: false, moodIndex: 0, scrollTarget: ''
    })
  }
})
