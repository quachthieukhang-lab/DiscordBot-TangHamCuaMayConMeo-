const fs = require('node:fs')
const path = require('node:path')
const logger = require('./logger')

const DATA_DIR = path.join(__dirname, '..', '..', 'data')
const STORE_PATH = path.join(DATA_DIR, 'welcome.json')

const DEFAULTS = {
  enabled: false,
  channelId: null,
  message: 'Chào mừng {user} đã đến với **{server}**! 🎉 Hiện server có {memberCount} thành viên.',
}

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
    logger.error(`Không đọc được welcome store: ${err.message}`)
    cache = {}
  }
  return cache
}

const persist = () => {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(cache, null, 2), 'utf8')
  } catch (err) {
    logger.error(`Không ghi được welcome store: ${err.message}`)
  }
}

const get = (guildId) => {
  const store = ensureLoaded()
  return { ...DEFAULTS, ...(store[guildId] || {}) }
}

const update = (guildId, patch) => {
  const store = ensureLoaded()
  store[guildId] = { ...DEFAULTS, ...(store[guildId] || {}), ...patch }
  persist()
  return store[guildId]
}

const renderMessage = (template, member) => {
  const guild = member.guild
  return template
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{tag}', member.user.tag)
    .replaceAll('{server}', guild.name)
    .replaceAll('{memberCount}', String(guild.memberCount))
}

module.exports = { get, update, renderMessage, DEFAULTS }
