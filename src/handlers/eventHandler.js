const fs = require('node:fs')
const path = require('node:path')
const logger = require('../utils/logger')

const loadEvents = (client) => {
  const eventsPath = path.join(__dirname, '..', 'events')

  if (!fs.existsSync(eventsPath)) {
    logger.warn('Không tìm thấy thư mục events/')
    return
  }

  const files = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))

  for (const file of files) {
    const filePath = path.join(eventsPath, file)
    const event = require(filePath)

    if (!event?.name || typeof event.execute !== 'function') {
      logger.warn(`Event ${file} thiếu "name" hoặc "execute" — bỏ qua`)
      continue
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client))
    } else {
      client.on(event.name, (...args) => event.execute(...args, client))
    }

    logger.info(`Đã nạp event: ${event.name}${event.once ? ' (once)' : ''}`)
  }
}

module.exports = { loadEvents }
