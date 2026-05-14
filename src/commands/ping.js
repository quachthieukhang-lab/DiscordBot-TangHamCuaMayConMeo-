const { SlashCommandBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra độ trễ của bot'),
  execute: async (interaction) => {
    const sent = await interaction.reply({
      content: 'Đang đo độ trễ...',
      fetchReply: true,
    })
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp
    const wsPing = interaction.client.ws.ping

    await interaction.editReply(
      `🏓 Pong!\n• Roundtrip: **${roundtrip}ms**\n• WebSocket: **${wsPing}ms**`
    )
  },
}
