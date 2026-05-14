const { Events, EmbedBuilder } = require('discord.js')
const welcomeStore = require('../utils/welcomeStore')
const logger = require('../utils/logger')

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  execute: async (member) => {
    if (member.user.bot) return

    const cfg = welcomeStore.get(member.guild.id)
    if (!cfg.enabled || !cfg.channelId) return

    try {
      const channel = await member.guild.channels.fetch(cfg.channelId)
      if (!channel?.isTextBased()) return

      const perms = channel.permissionsFor(member.guild.members.me)
      if (!perms?.has(['SendMessages', 'EmbedLinks'])) {
        logger.warn(
          `Thiếu quyền gửi welcome ở #${channel.name} (guild ${member.guild.id})`
        )
        return
      }

      const content = welcomeStore.renderMessage(cfg.message, member)
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(content)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `ID: ${member.id}` })
        .setTimestamp()

      await channel.send({ content: `<@${member.id}>`, embeds: [embed] })
    } catch (err) {
      logger.error(`Lỗi gửi welcome: ${err.message}`)
    }
  },
}
