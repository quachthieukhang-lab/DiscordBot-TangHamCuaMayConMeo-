const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js')
const welcomeStore = require('../utils/welcomeStore')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Cấu hình tin nhắn chào mừng thành viên mới')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName('toggle')
        .setDescription('Bật/tắt tính năng chào mừng')
        .addBooleanOption((opt) =>
          opt
            .setName('enabled')
            .setDescription('true = bật, false = tắt')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Đặt kênh gửi tin nhắn chào mừng')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Kênh text')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('message')
        .setDescription(
          'Đặt nội dung. Biến: {user} {username} {tag} {server} {memberCount}'
        )
        .addStringOption((opt) =>
          opt
            .setName('content')
            .setDescription('Nội dung tin chào mừng (tối đa 1000 ký tự)')
            .setRequired(true)
            .setMaxLength(1000)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Xem cấu hình hiện tại')
    )
    .addSubcommand((sub) =>
      sub
        .setName('test')
        .setDescription('Gửi thử tin chào mừng cho chính bạn')
    ),
  execute: async (interaction) => {
    const sub = interaction.options.getSubcommand()
    const guildId = interaction.guildId

    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled', true)
      const cfg = welcomeStore.update(guildId, { enabled })
      if (enabled && !cfg.channelId) {
        return interaction.reply({
          content:
            '✅ Đã **bật** chào mừng, nhưng chưa có kênh. Dùng `/welcome channel` để đặt.',
          flags: MessageFlags.Ephemeral,
        })
      }
      return interaction.reply({
        content: enabled ? '✅ Đã **bật** chào mừng.' : '⏸️ Đã **tắt** chào mừng.',
        flags: MessageFlags.Ephemeral,
      })
    }

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel', true)
      welcomeStore.update(guildId, { channelId: channel.id })
      return interaction.reply({
        content: `✅ Kênh chào mừng: <#${channel.id}>`,
        flags: MessageFlags.Ephemeral,
      })
    }

    if (sub === 'message') {
      const content = interaction.options.getString('content', true)
      welcomeStore.update(guildId, { message: content })
      return interaction.reply({
        content: `✅ Đã cập nhật nội dung. Preview:\n${welcomeStore.renderMessage(
          content,
          interaction.member
        )}`,
        flags: MessageFlags.Ephemeral,
      })
    }

    if (sub === 'status') {
      const cfg = welcomeStore.get(guildId)
      const embed = new EmbedBuilder()
        .setColor(cfg.enabled ? 0x57f287 : 0xed4245)
        .setTitle('⚙️ Cấu hình chào mừng')
        .addFields(
          { name: 'Trạng thái', value: cfg.enabled ? '🟢 Bật' : '🔴 Tắt', inline: true },
          {
            name: 'Kênh',
            value: cfg.channelId ? `<#${cfg.channelId}>` : '_(chưa đặt)_',
            inline: true,
          },
          { name: 'Nội dung', value: `\`\`\`${cfg.message}\`\`\`` }
        )
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
    }

    if (sub === 'test') {
      const cfg = welcomeStore.get(guildId)
      const preview = welcomeStore.renderMessage(cfg.message, interaction.member)
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(preview)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Đây là tin test — không gửi vào kênh chào mừng' })
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      })
    }
  },
}
