const { Events } = require('discord.js')
const logger = require('../utils/logger')
const config = require('../config/config')

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute: async (client) => {
    logger.success(`Bot đã sẵn sàng: ${client.user.tag}`)
    logger.info(`Đang phục vụ ${client.guilds.cache.size} server(s)`)

    if (!config.channelId) return

    try {
      const channel = await client.channels.fetch(config.channelId)
      if (!channel) {
        logger.warn('Không tìm thấy kênh từ CHANNEL_ID')
        return
      }
      await channel.send(
        'Đây là tin nhắn test từ bot! 🚀\nNếu bạn thấy dòng này nghĩa là bot đã hoạt động bình thường.'
      )
      logger.success('Đã gửi tin nhắn test!')
    } catch (err) {
      logger.error(err)
    }
  },
}
