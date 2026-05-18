const fs = require('node:fs')
const path = require('node:path')
const logger = require('./logger')

const DATA_DIR = path.join(__dirname, '..', '..', 'data')
const STORE_PATH = path.join(DATA_DIR, 'giveaways.json')

let cache = null

const ensureLoaded = () => {
  if (cache) return cache
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(STORE_PATH)) {
      cache = {}
      fs.writeFileSync(STORE_PATH, '{}', 'utf8')
    } else {
      cache = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8') || '{}')
    }
  } catch (err) {
    logger.error(`Không đọc được giveaway store: ${err.message}`)
    cache = {}
  }
  return cache
}

const persist = () => {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(cache, null, 2), 'utf8')
  } catch (err) {
    logger.error(`Không ghi được giveaway store: ${err.message}`)
  }
}

const get = (messageId) => ensureLoaded()[messageId] || null

const create = (record) => {
  const store = ensureLoaded()
  store[record.messageId] = record
  persist()
  return record
}

const update = (messageId, patch) => {
  const store = ensureLoaded()
  if (!store[messageId]) return null
  store[messageId] = { ...store[messageId], ...patch }
  persist()
  return store[messageId]
}

const remove = (messageId) => {
  const store = ensureLoaded()
  delete store[messageId]
  persist()
}

const addEntry = (messageId, userId) => {
  const store = ensureLoaded()
  const g = store[messageId]
  if (!g) return { ok: false, reason: 'not_found' }
  if (g.ended) return { ok: false, reason: 'ended' }
  if (g.entries.includes(userId)) return { ok: false, reason: 'duplicate' }
  g.entries.push(userId)
  persist()
  return { ok: true, count: g.entries.length }
}

const listActive = () => {
  const store = ensureLoaded()
  return Object.values(store).filter((g) => !g.ended)
}

const listByGuild = (guildId) => {
  const store = ensureLoaded()
  return Object.values(store).filter((g) => g.guildId === guildId)
}

module.exports = {
  get,
  create,
  update,
  remove,
  addEntry,
  listActive,
  listByGuild,
}
