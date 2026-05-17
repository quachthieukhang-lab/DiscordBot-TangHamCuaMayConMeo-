const http = require('node:http')
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

// Healthcheck cho Fly proxy. Discord bot là outbound-only, nhưng Fly UI hay
// auto-generate fly.toml với [http_service] internal_port = 3000 — server này
// đảm bảo proxy không log "instance refused connection" dù config có thế nào.
const port = Number(process.env.PORT) || 3000
http
  .createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end(client.isReady() ? 'ok' : 'starting')
      return
    }
    res.writeHead(404).end()
  })
  .listen(port, '0.0.0.0', () => logger.info(`Healthcheck server on 0.0.0.0:${port}`))

client.login(config.token).catch((err) => {
  logger.error('Không thể đăng nhập bot:')
  logger.error(err)
  process.exit(1)
})
