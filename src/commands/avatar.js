const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Xem avatar của một thành viên')
    .addUserOption((opt) =>
      opt
        .setName('target')
        .setDescription('Thành viên cần xem (bỏ trống để xem chính bạn)')
        .setRequired(false)
    ),
  execute: async (interaction) => {
    const user = interaction.options.getUser('target') ?? interaction.user
    const avatarURL = user.displayAvatarURL({ size: 1024, extension: 'png' })

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setTitle(`Avatar của ${user.username}`)
      .setURL(avatarURL)
      .setImage(avatarURL)
      .setDescription(
        `[PNG](${user.displayAvatarURL({ size: 1024, extension: 'png' })}) • ` +
        `[JPG](${user.displayAvatarURL({ size: 1024, extension: 'jpg' })}) • ` +
        `[WEBP](${user.displayAvatarURL({ size: 1024, extension: 'webp' })})` +
        (user.avatar?.startsWith('a_')
          ? ` • [GIF](${user.displayAvatarURL({ size: 1024, extension: 'gif' })})`
          : '')
      )
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
