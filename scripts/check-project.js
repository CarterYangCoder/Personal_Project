const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const ignored = new Set(['node_modules', '.git', 'coverage'])
const files = []

function walk(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    if (ignored.has(entry.name)) return
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(target)
    else files.push(target)
  })
}

walk(root)

let failed = false
files.filter(file => file.endsWith('.json')).forEach(file => {
  try { JSON.parse(fs.readFileSync(file, 'utf8')) } catch (error) {
    failed = true
    console.error(`JSON 解析失败：${path.relative(root, file)}\n${error.message}`)
  }
})

files.filter(file => file.endsWith('.js')).forEach(file => {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (result.status !== 0) {
    failed = true
    console.error(`JavaScript 语法检查失败：${path.relative(root, file)}\n${result.stderr}`)
  }
})

if (failed) process.exit(1)
console.log(`检查通过：${files.filter(file => file.endsWith('.js')).length} 个 JS，${files.filter(file => file.endsWith('.json')).length} 个 JSON。`)
