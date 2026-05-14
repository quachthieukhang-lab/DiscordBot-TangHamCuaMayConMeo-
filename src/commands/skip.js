const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { skip, getQueue } = require('../utils/musicQueue')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Bỏ qua bài đang phát'),
  execute: async (interaction) => {
    const queue = getQueue(interaction.guildId)
    if (!queue || !queue.current) {
      return interaction.reply({
        content: 'Không có bài nào đang phát.',
        flags: MessageFlags.Ephemeral,
      })
    }

    const skipped = skip(interaction.guildId)
    await interaction.reply(`⏭️ Đã bỏ qua: **${skipped.title}**`)
  },
}
