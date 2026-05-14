const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { addTrack } = require('../utils/musicQueue')

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
    .setName('play')
    .setDescription('Phát nhạc từ YouTube')
    .addStringOption((opt) =>
      opt
        .setName('query')
        .setDescription('Tên bài hát hoặc link YouTube')
        .setRequired(true)
    ),
  execute: async (interaction) => {
    const query = interaction.options.getString('query', true)
    const voiceChannel = interaction.member.voice?.channel

    if (!voiceChannel) {
      return interaction.reply({
        content: 'Bạn phải vào voice channel trước!',
        flags: MessageFlags.Ephemeral,
      })
    }

    const perms = voiceChannel.permissionsFor(interaction.client.user)
    if (!perms?.has(['Connect', 'Speak'])) {
      return interaction.reply({
        content: 'Bot không có quyền **Connect** hoặc **Speak** trong voice channel này.',
        flags: MessageFlags.Ephemeral,
      })
    }

    await interaction.deferReply()

    try {
      const { track, position } = await addTrack(
        interaction.guildId,
        voiceChannel,
        interaction.channel,
        query,
        interaction.user.id
      )

      if (position === 0) {
        await interaction.editReply(
          `▶️ Đang chuẩn bị phát: **${track.title}** (${formatDuration(track.duration)})`
        )
      } else {
        await interaction.editReply(
          `✅ Đã thêm vào queue ở vị trí **#${position}**: **${track.title}** (${formatDuration(track.duration)})`
        )
      }
    } catch (err) {
      await interaction.editReply(`❌ Lỗi: ${err.message}`)
    }
  },
}
