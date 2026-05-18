const { Events } = require('discord.js')
const logger = require('../utils/logger')
const config = require('../config/config')
const giveawayManager = require('../utils/giveawayManager')

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute: async (client) => {
    logger.success(`Bot đã sẵn sàng: ${client.user.tag}`)
    logger.info(`Đang phục vụ ${client.guilds.cache.size} server(s)`)

    giveawayManager.initOnReady(client)

    if (!config.channelId) return

    try {
      const channel = await client.channels.fetch(config.channelId)
      if (!channel) {
        logger.warn('Không tìm thấy kênh từ CHANNEL_ID')
        return
      }
      logger.success('Đã kết nối với kênh!')
    } catch (err) {
      logger.error(err)
    }
  },
}
