const fs = require('node:fs')
const path = require('node:path')
const { REST, Routes } = require('discord.js')
const config = require('./src/config/config')
const logger = require('./src/utils/logger')

const commands = []
const commandsPath = path.join(__dirname, 'src', 'commands')
const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))

for (const file of files) {
  const command = require(path.join(commandsPath, file))
  if (command?.data) {
    commands.push(command.data.toJSON())
  }
}

const rest = new REST().setToken(config.token)

;(async () => {
  try {
    logger.info(`Đang đăng ký ${commands.length} slash command(s)...`)

    const route = config.guildId
      ? Routes.applicationGuildCommands(config.clientId, config.guildId)
      : Routes.applicationCommands(config.clientId)

    const data = await rest.put(route, { body: commands })

    logger.success(
      `Đăng ký thành công ${data.length} command(s) ${
        config.guildId ? `cho guild ${config.guildId}` : '(global)'
      }`
    )
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
})()
