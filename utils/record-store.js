const cloudData = require('./cloud-data')

const QUEUE_PREFIX = 'summerCloudSyncQueue'
let activeFlush = null

function currentOwnerId() {
  const profile = getApp().globalData.profile
  return profile && profile.openid
}

function storageKey(prefix) {
  const ownerId = currentOwnerId()
  return ownerId ? `${prefix}:${ownerId}` : ''
}

function queueKey() {
  const ownerId = currentOwnerId()
  return ownerId ? `${QUEUE_PREFIX}:${ownerId}` : ''
}

function migrationKey(collection) {
  const ownerId = currentOwnerId()
  return ownerId ? `summerCloudMigrated:${collection}:${ownerId}` : ''
}

function read(prefix) {
  const key = storageKey(prefix)
  return key ? (wx.getStorageSync(key) || []) : []
}

function write(prefix, records) {
  const key = storageKey(prefix)
  if (key) wx.setStorageSync(key, records)
  return records
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeRecord(record) {
  const { _id, _openid, ...data } = record || {}
  return { ...data, id: data.clientId || data.id || _id }
}

function enqueue(operation) {
  const key = queueKey()
  if (!key) return
  const queue = wx.getStorageSync(key) || []
  const identity = `${operation.collection}:${operation.id || (operation.data && operation.data.clientId)}`
  const next = queue.filter(item => `${item.collection}:${item.id || (item.data && item.data.clientId)}` !== identity)
  next.push({ ...operation, queueId: createId() })
  wx.setStorageSync(key, next)
}

async function runFlush() {
  const key = queueKey()
  if (!key || !cloudData.cloudReady()) return false
  while (true) {
    const queue = wx.getStorageSync(key) || []
    if (!queue.length) return true
    const item = queue[0]
    try {
      if (item.type === 'remove') await cloudData.remove(item.collection, item.id)
      else await cloudData.put(item.collection, item.data)
      const latest = wx.getStorageSync(key) || []
      const identity = `${item.collection}:${item.id || (item.data && item.data.clientId)}`
      const index = item.queueId
        ? latest.findIndex(entry => entry.queueId === item.queueId)
        : latest.findIndex(entry => `${entry.collection}:${entry.id || (entry.data && entry.data.clientId)}` === identity)
      if (index >= 0) latest.splice(index, 1)
      wx.setStorageSync(key, latest)
    } catch (error) {
      return false
    }
  }
}

function flush() {
  if (activeFlush) return activeFlush
  activeFlush = runFlush().finally(() => { activeFlush = null })
  return activeFlush
}

async function sync(collection, prefix) {
  if (!currentOwnerId() || !cloudData.cloudReady()) return read(prefix)
  const localRecords = read(prefix)
  const migratedKey = migrationKey(collection)
  if (migratedKey && !wx.getStorageSync(migratedKey) && localRecords.length) {
    localRecords.forEach(record => {
      const clientId = String(record.clientId || record.id || createId())
      enqueue({ type: 'put', collection, data: { ...record, id: clientId, clientId } })
    })
  }
  const flushed = await flush()
  if (!flushed) return read(prefix)
  try {
    const records = (await cloudData.list(collection)).map(normalizeRecord)
    if ((wx.getStorageSync(queueKey()) || []).length) return read(prefix)
    write(prefix, records)
    if (migratedKey) wx.setStorageSync(migratedKey, true)
    return records
  } catch (error) {
    return read(prefix)
  }
}

async function put(collection, prefix, record) {
  const normalized = normalizeRecord({ ...record, clientId: String(record.clientId || record.id || createId()) })
  const records = read(prefix)
  const index = records.findIndex(item => String(item.clientId || item.id) === normalized.clientId)
  const next = index >= 0
    ? records.map((item, itemIndex) => itemIndex === index ? normalized : item)
    : [normalized, ...records]
  write(prefix, next)
  enqueue({ type: 'put', collection, data: { ...normalized, clientId: normalized.clientId } })
  const synced = await flush()
  return { records: next, record: normalized, synced }
}

async function remove(collection, prefix, id) {
  const clientId = String(id)
  const records = read(prefix).filter(item => String(item.clientId || item.id) !== clientId)
  write(prefix, records)
  enqueue({ type: 'remove', collection, id: clientId })
  const synced = await flush()
  return { records, synced }
}

module.exports = { createId, read, write, sync, put, remove, flush, storageKey }
