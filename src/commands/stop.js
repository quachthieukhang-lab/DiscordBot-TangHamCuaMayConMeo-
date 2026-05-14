const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { destroyQueue, getQueue } = require('../utils/musicQueue')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Dừng nhạc, xóa queue và rời voice channel'),
  execute: async (interaction) => {
    const queue = getQueue(interaction.guildId)
    if (!queue) {
      return interaction.reply({
        content: 'Bot không đang phát nhạc.',
        flags: MessageFlags.Ephemeral,
      })
    }

    destroyQueue(interaction.guildId)
    await interaction.reply('⏹️ Đã dừng nhạc và rời voice channel.')
  },
}
