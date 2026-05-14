const fs = require('node:fs')
const path = require('node:path')
const { Collection } = require('discord.js')
const logger = require('../utils/logger')

const loadCommands = (client) => {
  client.commands = new Collection()
  const commandsPath = path.join(__dirname, '..', 'commands')

  if (!fs.existsSync(commandsPath)) {
    logger.warn('Không tìm thấy thư mục commands/')
    return
  }

  const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))

  for (const file of files) {
    const filePath = path.join(commandsPath, file)
    const command = require(filePath)

    if (!command?.data || !command?.execute) {
      logger.warn(`Command ${file} thiếu "data" hoặc "execute" — bỏ qua`)
      continue
    }

    client.commands.set(command.data.name, command)
    logger.info(`Đã nạp command: /${command.data.name}`)
  }

  logger.success(`Tổng cộng ${client.commands.size} commands được nạp`)
}

module.exports = { loadCommands }
