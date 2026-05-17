const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js')
const logger = require('../utils/logger')

const buildRoleOption = (opt) =>
  opt.setName('role').setDescription('Role mục tiêu').setRequired(true)

const buildBotsOption = (opt) =>
  opt
    .setName('include_bots')
    .setDescription('Có áp dụng cho bot không (mặc định: không)')
    .setRequired(false)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleall')
    .setDescription('Thêm/xóa 1 role cho tất cả member (chỉ owner)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Thêm role cho tất cả member chưa có')
        .addRoleOption(buildRoleOption)
        .addBooleanOption(buildBotsOption)
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Xóa role khỏi tất cả member đang có')
        .addRoleOption(buildRoleOption)
        .addBooleanOption(buildBotsOption)
    ),
  execute: async (interaction) => {
    const ownerId = process.env.OWNER_ID
    if (!ownerId) {
      return interaction.reply({
        content: '❌ Chưa cấu hình `OWNER_ID` trong `.env`.',
        flags: MessageFlags.Ephemeral,
      })
    }
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: '⛔ Chỉ owner của bot mới dùng được lệnh này.',
        flags: MessageFlags.Ephemeral,
      })
    }

    const mode = interaction.options.getSubcommand() // 'add' | 'remove'
    const role = interaction.options.getRole('role', true)
    const includeBots = interaction.options.getBoolean('include_bots') ?? false
    const guild = interaction.guild
    const me = guild.members.me

    if (role.id === guild.id) {
      return interaction.reply({
        content: '❌ Không thể thao tác trên role `@everyone`.',
        flags: MessageFlags.Ephemeral,
      })
    }
    if (role.managed) {
      return interaction.reply({
        content: '❌ Role này do tích hợp quản lý, không thể thao tác thủ công.',
        flags: MessageFlags.Ephemeral,
      })
    }
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: '❌ Bot thiếu quyền `Manage Roles`.',
        flags: MessageFlags.Ephemeral,
      })
    }
    if (role.position >= me.roles.highest.position) {
      return interaction.reply({
        content: `❌ Role ${role} cao hơn hoặc bằng role cao nhất của bot — không thể thao tác.`,
        flags: MessageFlags.Ephemeral,
      })
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    await guild.members.fetch()
    const targets = guild.members.cache.filter((m) => {
      if (!includeBots && m.user.bot) return false
      return mode === 'add' ? !m.roles.cache.has(role.id) : m.roles.cache.has(role.id)
    })

    const verbVi = mode === 'add' ? 'thêm' : 'xóa'

    if (targets.size === 0) {
      return interaction.editReply(
        `✅ Không có member nào cần ${verbVi} role ${role}.`
      )
    }

    await interaction.editReply(
      `⏳ Đang ${verbVi} ${role} cho ${targets.size} member... (sẽ mất 1 lúc)`
    )

    let success = 0
    let failed = 0
    const reason = `Bulk ${mode} by ${interaction.user.tag}`
    for (const member of targets.values()) {
      try {
        if (mode === 'add') {
          await member.roles.add(role, reason)
        } else {
          await member.roles.remove(role, reason)
        }
        success++
      } catch (err) {
        failed++
        logger.warn(
          `Không ${verbVi} được role cho ${member.user.tag}: ${err.message}`
        )
      }
    }

    const embed = new EmbedBuilder()
      .setColor(failed === 0 ? 0x57f287 : 0xfee75c)
      .setTitle(`Kết quả ${mode === 'add' ? 'thêm' : 'xóa'} role hàng loạt`)
      .setDescription(`Role: ${role}`)
      .addFields(
        { name: '✅ Thành công', value: String(success), inline: true },
        { name: '❌ Thất bại', value: String(failed), inline: true },
        { name: 'Tổng', value: String(targets.size), inline: true }
      )
      .setTimestamp()

    await interaction.editReply({ content: '', embeds: [embed] })
  },
}
