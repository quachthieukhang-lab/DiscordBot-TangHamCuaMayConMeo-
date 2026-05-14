const { Client, GatewayIntentBits } = require('discord.js')
const config = require('./config/config')
const logger = require('./utils/logger')
const { loadCommands } = require('./handlers/commandHandler')
const { loadEvents } = require('./handlers/eventHandler')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
})

loadCommands(client)
loadEvents(client)

process.on('unhandledRejection', (err) => logger.error(err))
process.on('uncaughtException', (err) => logger.error(err))

client.login(config.token).catch((err) => {
  logger.error('Không thể đăng nhập bot:')
  logger.error(err)
  process.exit(1)
})
