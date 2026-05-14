const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiển thị danh sách lệnh có sẵn'),
  execute: async (interaction) => {
    const commands = interaction.client.commands

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 Danh sách lệnh')
      .setDescription(
        commands
          .map((cmd) => `\`/${cmd.data.name}\` — ${cmd.data.description}`)
          .join('\n') || 'Chưa có lệnh nào.'
      )
      .setFooter({ text: `Tổng ${commands.size} lệnh` })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
