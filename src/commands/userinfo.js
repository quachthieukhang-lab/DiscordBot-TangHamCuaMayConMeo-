const { SlashCommandBuilder, EmbedBuilder, time, TimestampStyles } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Xem thông tin của một thành viên')
    .addUserOption((opt) =>
      opt
        .setName('target')
        .setDescription('Thành viên cần xem (bỏ trống để xem chính bạn)')
        .setRequired(false)
    ),
  execute: async (interaction) => {
    const user = interaction.options.getUser('target') ?? interaction.user
    const member = interaction.guild
      ? await interaction.guild.members.fetch(user.id).catch(() => null)
      : null

    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor && member.displayHexColor !== '#000000'
        ? member.displayHexColor
        : 0x5865f2)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: `\`${user.id}\``, inline: true },
        { name: 'Bot', value: user.bot ? 'Có' : 'Không', inline: true },
        {
          name: 'Tạo tài khoản',
          value: time(user.createdAt, TimestampStyles.RelativeTime),
          inline: false,
        }
      )

    if (member) {
      embed.addFields({
        name: 'Tham gia server',
        value: member.joinedAt
          ? time(member.joinedAt, TimestampStyles.RelativeTime)
          : 'Không rõ',
        inline: false,
      })

      const roles = member.roles.cache
        .filter((r) => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => r.toString())

      if (roles.length) {
        const roleText = roles.join(' ')
        embed.addFields({
          name: `Roles (${roles.length})`,
          value: roleText.length > 1024 ? roleText.slice(0, 1021) + '...' : roleText,
        })
      }
    }

    embed.setTimestamp()
    await interaction.reply({ embeds: [embed] })
  },
}
