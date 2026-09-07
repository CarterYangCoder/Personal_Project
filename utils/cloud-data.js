function cloudReady() {
  return !!getApp().globalData.cloudEnabled
}

async function call(action, collection, payload = {}) {
  const result = await wx.cloud.callFunction({
    name: 'dataService',
    data: { action, collection, ...payload }
  })
  if (!result.result || !result.result.ok) throw new Error((result.result && result.result.message) || '云端操作失败')
  return result.result.data
}

module.exports = {
  cloudReady,
  login: () => call('login', 'profiles'),
  list: collection => call('list', collection),
  put: (collection, data) => call('put', collection, { data }),
  remove: (collection, id) => call('remove', collection, { id }),
  upsertProfile: data => call('upsertProfile', 'profiles', { data }),
  askAssistant: payload => call('assistant', 'assistant', payload),
  async uploadAvatar(filePath, openid) {
    if (!cloudReady() || !filePath || filePath.startsWith('cloud://')) return filePath
    const extension = (filePath.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0].toLowerCase()
    const result = await wx.cloud.uploadFile({
      cloudPath: `avatars/${openid}/${Date.now()}${extension}`,
      filePath
    })
    return result.fileID
  }
}
