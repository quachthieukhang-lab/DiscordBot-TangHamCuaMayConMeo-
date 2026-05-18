const { Events, MessageFlags } = require('discord.js')
const logger = require('../utils/logger')
const giveawayStore = require('../utils/giveawayStore')
const giveawayManager = require('../utils/giveawayManager')

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  execute: async (interaction) => {
    if (interaction.isButton()) {
      const [ns, action, messageId] = interaction.customId.split(':')
      if (ns === 'giveaway' && action === 'enter') {
        const result = giveawayStore.addEntry(messageId, interaction.user.id)
        const messages = {
          not_found: '❌ Giveaway không còn tồn tại.',
          ended: '⏰ Giveaway đã kết thúc.',
          duplicate: '⚠️ Bạn đã tham gia rồi.',
        }
        if (!result.ok) {
          return interaction.reply({
            content: messages[result.reason] ?? '❌ Không thể tham gia.',
            flags: MessageFlags.Ephemeral,
          })
        }
        giveawayManager.scheduleRefresh(interaction.client, messageId)
        return interaction.reply({
          content: `🎉 Đã ghi danh! Hiện có **${result.count}** người tham gia.`,
          flags: MessageFlags.Ephemeral,
        })
      }
      return
    }

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
