const { Events, MessageFlags } = require('discord.js')
const logger = require('../utils/logger')

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  execute: async (interaction) => {
    if (!interaction.isChatInputCommand()) return

    const command = interaction.client.commands.get(interaction.commandName)
    if (!command) {
      logger.warn(`Không tìm thấy command: ${interaction.commandName}`)
      return
    }

    try {
      await command.execute(interaction)
    } catch (err) {
      logger.error(err)

      const reply = {
        content: 'Đã xảy ra lỗi khi thực thi lệnh này.',
        flags: MessageFlags.Ephemeral,
      }

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {})
      } else {
        await interaction.reply(reply).catch(() => {})
      }
    }
  },
}
