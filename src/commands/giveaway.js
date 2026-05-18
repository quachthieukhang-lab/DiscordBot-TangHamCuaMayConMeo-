const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js')
const manager = require('../utils/giveawayManager')
const store = require('../utils/giveawayStore')

const MIN_DURATION_MS = 10_000
const MAX_DURATION_MS = 14 * 86_400_000

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Tạo và quản lý giveaway')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Bắt đầu giveaway mới')
        .addStringOption((opt) =>
          opt
            .setName('prize')
            .setDescription('Phần thưởng')
            .setRequired(true)
            .setMaxLength(200)
        )
        .addStringOption((opt) =>
          opt
            .setName('duration')
            .setDescription('Thời gian (vd: 30s, 5m, 1h, 2d, 1h30m)')
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('winners')
            .setDescription('Số người thắng (mặc định 1)')
            .setMinValue(1)
            .setMaxValue(50)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Kênh đăng (mặc định kênh hiện tại)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('Kết thúc giveaway sớm')
        .addStringOption((opt) =>
          opt
            .setName('message_id')
            .setDescription('Message ID của giveaway')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Quay lại người thắng cho giveaway đã kết thúc')
        .addStringOption((opt) =>
          opt
            .setName('message_id')
            .setDescription('Message ID của giveaway đã kết thúc')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Liệt kê giveaway đang chạy')
    ),
  execute: async (interaction) => {
    const sub = interaction.options.getSubcommand()
    const client = interaction.client

    if (sub === 'start') {
      const prize = interaction.options.getString('prize', true)
      const durationRaw = interaction.options.getString('duration', true)
      const winnersCount = interaction.options.getInteger('winners') ?? 1
      const channel =
        interaction.options.getChannel('channel') ?? interaction.channel

      const durationMs = manager.parseDuration(durationRaw)
      if (!durationMs || durationMs < MIN_DURATION_MS) {
        return interaction.reply({
          content:
            '❌ Thời gian không hợp lệ. Tối thiểu 10s. Ví dụ: `30s`, `5m`, `1h`, `1d`, `1h30m`.',
          flags: MessageFlags.Ephemeral,
        })
      }
      if (durationMs > MAX_DURATION_MS) {
        return interaction.reply({
          content: '❌ Thời gian tối đa: 14 ngày.',
          flags: MessageFlags.Ephemeral,
        })
      }

      const me = await interaction.guild.members.fetchMe()
      const perms = channel.permissionsFor(me)
      if (
        !perms?.has(PermissionFlagsBits.ViewChannel) ||
        !perms?.has(PermissionFlagsBits.SendMessages) ||
        !perms?.has(PermissionFlagsBits.EmbedLinks)
      ) {
        return interaction.reply({
          content: `❌ Bot thiếu quyền **View Channel / Send Messages / Embed Links** ở <#${channel.id}>.`,
          flags: MessageFlags.Ephemeral,
        })
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      try {
        const record = await manager.startGiveaway({
          client,
          channel,
          prize,
          winnersCount,
          durationMs,
          hostId: interaction.user.id,
        })
        return interaction.editReply({
          content: `✅ Đã tạo giveaway tại <#${channel.id}>. Message ID: \`${record.messageId}\``,
        })
      } catch (err) {
        return interaction.editReply({
          content: `❌ Không thể tạo giveaway: ${err.message}`,
        })
      }
    }

    if (sub === 'end') {
      const messageId = interaction.options.getString('message_id', true)
      const g = store.get(messageId)
      if (!g || g.guildId !== interaction.guildId) {
        return interaction.reply({
          content: '❌ Không tìm thấy giveaway với message ID đó.',
          flags: MessageFlags.Ephemeral,
        })
      }
      if (g.ended) {
        return interaction.reply({
          content: '⚠️ Giveaway này đã kết thúc rồi.',
          flags: MessageFlags.Ephemeral,
        })
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      await manager.endGiveaway(client, messageId)
      return interaction.editReply({ content: '✅ Đã kết thúc giveaway.' })
    }

    if (sub === 'reroll') {
      const messageId = interaction.options.getString('message_id', true)
      const g = store.get(messageId)
      if (!g || g.guildId !== interaction.guildId) {
        return interaction.reply({
          content: '❌ Không tìm thấy giveaway với message ID đó.',
          flags: MessageFlags.Ephemeral,
        })
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      const result = await manager.rerollGiveaway(client, messageId)
      if (!result.ok) {
        const reasons = {
          not_found: 'Không tìm thấy giveaway.',
          not_ended: 'Giveaway chưa kết thúc — không thể reroll.',
          no_entries: 'Không có ai tham gia, không thể reroll.',
          no_channel: 'Không tìm thấy kênh giveaway.',
        }
        return interaction.editReply({
          content: `❌ ${reasons[result.reason] ?? 'Lỗi không xác định.'}`,
        })
      }
      return interaction.editReply({
        content: `✅ Đã reroll: ${result.winners.map((id) => `<@${id}>`).join(', ')}`,
      })
    }

    if (sub === 'list') {
      const active = store
        .listByGuild(interaction.guildId)
        .filter((g) => !g.ended)
      if (active.length === 0) {
        return interaction.reply({
          content: '_(Không có giveaway nào đang chạy)_',
          flags: MessageFlags.Ephemeral,
        })
      }
      const embed = new EmbedBuilder()
        .setTitle('🎉 Giveaway đang chạy')
        .setColor(0xf1c40f)
        .setDescription(
          active
            .map(
              (g) =>
                `• **${g.prize}** — <#${g.channelId}> — kết thúc <t:${Math.floor(
                  g.endsAt / 1000
                )}:R> — \`${g.messageId}\``
            )
            .join('\n')
        )
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
    }
  },
}
