const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js')
const { getQueue } = require('../utils/musicQueue')

const formatDuration = (sec) => {
  if (!sec) return 'Live'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Xem danh sách bài đang chờ'),
  execute: async (interaction) => {
    const queue = getQueue(interaction.guildId)
    if (!queue || (!queue.current && queue.tracks.length === 0)) {
      return interaction.reply({
        content: 'Queue trống.',
        flags: MessageFlags.Ephemeral,
      })
    }

    const upcoming = queue.tracks
      .slice(0, 10)
      .map(
        (t, i) =>
          `**${i + 1}.** ${t.title} \`${formatDuration(t.duration)}\` — <@${t.requestedBy}>`
      )
      .join('\n')

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎶 Music Queue')
      .setDescription(
        queue.current
          ? `**Đang phát:** ${queue.current.title} \`${formatDuration(queue.current.duration)}\` — <@${queue.current.requestedBy}>`
          : '_Không có bài đang phát_'
      )

    if (upcoming) {
      embed.addFields({
        name: `Sắp tới (${queue.tracks.length} bài)`,
        value: upcoming + (queue.tracks.length > 10 ? `\n... và ${queue.tracks.length - 10} bài khác` : ''),
      })
    }

    await interaction.reply({ embeds: [embed] })
  },
}
