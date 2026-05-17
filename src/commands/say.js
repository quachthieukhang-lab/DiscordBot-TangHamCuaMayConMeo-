const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
} = require('@discordjs/voice')
const googleTTS = require('google-tts-api')
const { getQueue } = require('../utils/musicQueue')
const logger = require('../utils/logger')

const LANGUAGES = [
  { name: 'Tiếng Việt', value: 'vi' },
  { name: 'English', value: 'en' },
  { name: '日本語 (Japanese)', value: 'ja' },
  { name: '한국어 (Korean)', value: 'ko' },
  { name: '中文 (Chinese)', value: 'zh-CN' },
  { name: 'Français', value: 'fr' },
  { name: 'Español', value: 'es' },
]

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Bot đọc text trong voice channel')
    .addStringOption((opt) =>
      opt
        .setName('text')
        .setDescription('Nội dung cần đọc (tối đa 500 ký tự)')
        .setRequired(true)
        .setMaxLength(500)
    )
    .addStringOption((opt) =>
      opt
        .setName('lang')
        .setDescription('Ngôn ngữ (mặc định: Tiếng Việt)')
        .setRequired(false)
        .addChoices(...LANGUAGES)
    ),
  execute: async (interaction) => {
    const text = interaction.options.getString('text', true)
    const lang = interaction.options.getString('lang') ?? 'vi'
    const voiceChannel = interaction.member.voice?.channel

    if (!voiceChannel) {
      return interaction.reply({
        content: 'Bạn phải vào voice channel trước!',
        flags: MessageFlags.Ephemeral,
      })
    }

    if (getQueue(interaction.guildId)) {
      return interaction.reply({
        content: 'Bot đang phát nhạc, dùng `/stop` trước rồi thử lại.',
        flags: MessageFlags.Ephemeral,
      })
    }

    const perms = voiceChannel.permissionsFor(interaction.client.user)
    if (!perms?.has(['Connect', 'Speak'])) {
      return interaction.reply({
        content: 'Bot không có quyền **Connect** hoặc **Speak**.',
        flags: MessageFlags.Ephemeral,
      })
    }

    try {
      await interaction.deferReply()
    } catch (err) {
      if (err.code === 10062) {
        logger.warn(
          `/say: interaction expired before defer (gateway latency / event loop block)`
        )
        return
      }
      throw err
    }

    let urls
    try {
      urls = googleTTS.getAllAudioUrls(text, {
        lang,
        slow: false,
        host: 'https://translate.google.com',
        splitPunct: ',.?!',
      })
    } catch (err) {
      return interaction.editReply(`❌ Lỗi tạo audio: ${err.message}`).catch(() => {})
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    })

    const player = createAudioPlayer()
    connection.subscribe(player)

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 10_000)

      await interaction.editReply(
        `🔊 Đang đọc (${LANGUAGES.find((l) => l.value === lang)?.name || lang}): _${text.slice(0, 100)}${text.length > 100 ? '...' : ''}_`
      ).catch(() => {})

      for (const { url } of urls) {
        const resource = createAudioResource(url)
        player.play(resource)
        await entersState(player, AudioPlayerStatus.Playing, 5_000)
        await new Promise((resolve, reject) => {
          player.once(AudioPlayerStatus.Idle, resolve)
          player.once('error', reject)
        })
      }
    } catch (err) {
      logger.error(`TTS error: ${err.message}`)
      await interaction.followUp({
        content: `❌ Lỗi khi phát: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {})
    } finally {
      try {
        player.stop()
      } catch {}
    }
  },
}
