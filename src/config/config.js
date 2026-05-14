require('dotenv').config()

const required = ['TOKEN', 'CLIENT_ID']
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Thiếu biến môi trường: ${key}. Hãy kiểm tra file .env`)
  }
}

module.exports = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  channelId: process.env.CHANNEL_ID || null,
  env: process.env.NODE_ENV || 'development',
}
