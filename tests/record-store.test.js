const test = require('node:test')
const assert = require('node:assert/strict')

const memory = new Map()
global.getApp = () => ({ globalData: { profile: { openid: 'test-user' }, cloudEnabled: false } })
global.wx = {
  getStorageSync(key) { return memory.get(key) },
  setStorageSync(key, value) { memory.set(key, value) }
}

const recordStore = require('../utils/record-store')
const cloudData = require('../utils/cloud-data')

test('离线写入会更新本地缓存并合并待同步操作', async () => {
  const created = await recordStore.put('workTasks', 'summerWorkTasks', { id: 'task-1', title: '完成测试', done: false })
  assert.equal(created.records.length, 1)
  assert.equal(created.synced, false)

  await recordStore.put('workTasks', 'summerWorkTasks', { id: 'task-1', title: '完成测试', done: true })
  const queue = memory.get('summerCloudSyncQueue:test-user')
  assert.equal(queue.length, 1)
  assert.equal(queue[0].data.done, true)

  const removed = await recordStore.remove('workTasks', 'summerWorkTasks', 'task-1')
  assert.deepEqual(removed.records, [])
  assert.equal(memory.get('summerCloudSyncQueue:test-user').length, 1)
  assert.equal(memory.get('summerCloudSyncQueue:test-user')[0].type, 'remove')
})

test('首次联网会迁移旧记录并清空同步队列', async () => {
  memory.clear()
  const remote = new Map()
  cloudData.cloudReady = () => true
  cloudData.put = async (collection, data) => { remote.set(`${collection}:${data.clientId}`, { ...data }) }
  cloudData.remove = async (collection, id) => { remote.delete(`${collection}:${id}`) }
  cloudData.list = async collection => Array.from(remote.entries())
    .filter(([key]) => key.startsWith(`${collection}:`))
    .map(([, value]) => value)

  memory.set('summerWorkTasks:test-user', [{ id: 123, title: '旧版本记录', done: false }])
  const records = await recordStore.sync('workTasks', 'summerWorkTasks')

  assert.equal(records.length, 1)
  assert.equal(records[0].title, '旧版本记录')
  assert.equal(remote.size, 1)
  assert.deepEqual(memory.get('summerCloudSyncQueue:test-user'), [])
  assert.equal(memory.get('summerCloudMigrated:workTasks:test-user'), true)
})
