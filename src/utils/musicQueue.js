const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice')
const ytdlp = require('youtube-dl-exec')
const YouTube = require('youtube-sr').default
const logger = require('./logger')

const queues = new Map()

const YT_URL_RE = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\//i

const getQueue = (guildId) => queues.get(guildId)

const createQueue = (guildId, voiceChannel, textChannel) => {
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  })

  const player = createAudioPlayer()
  connection.subscribe(player)

  const queue = {
    voiceChannel,
    textChannel,
    connection,
    player,
    tracks: [],
    current: null,
    playing: false,
    subprocess: null,
  }

  player.on(AudioPlayerStatus.Idle, () => {
    if (queue.subprocess) {
      try { queue.subprocess.kill() } catch {}
      queue.subprocess = null
    }
    queue.current = null
    playNext(guildId)
  })

  player.on('error', (err) => {
    logger.error(`Lỗi player guild ${guildId}: ${err.message}`)
    queue.current = null
    playNext(guildId)
  })

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ])
    } catch {
      destroyQueue(guildId)
    }
  })

  queues.set(guildId, queue)
  return queue
}

const playNext = async (guildId) => {
  const queue = queues.get(guildId)
  if (!queue) return

  if (queue.tracks.length === 0) {
    queue.playing = false
    queue.textChannel
      ?.send('Hết bài trong queue. Tự rời voice channel sau 30s.')
      .catch(() => {})
    setTimeout(() => {
      const q = queues.get(guildId)
      if (q && q.tracks.length === 0 && !q.current) destroyQueue(guildId)
    }, 30_000)
    return
  }

  const track = queue.tracks.shift()
  queue.current = track
  queue.playing = true

  try {
    const subprocess = ytdlp.exec(
      track.url,
      {
        output: '-',
        format: 'bestaudio[ext=webm+acodec=opus]/bestaudio',
        quiet: true,
        noWarnings: true,
        noPlaylist: true,
      },
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )

    queue.subprocess = subprocess

    subprocess.stderr?.on('data', (chunk) => {
      const msg = chunk.toString().trim()
      if (msg) logger.debug(`yt-dlp: ${msg}`)
    })

    subprocess.on('error', (err) => {
      logger.error(`yt-dlp process error: ${err.message}`)
    })

    const resource = createAudioResource(subprocess.stdout, {
      inputType: StreamType.WebmOpus,
      inlineVolume: false,
    })

    queue.player.play(resource)

    queue.textChannel
      ?.send(`🎵 Đang phát: **${track.title}** — yêu cầu bởi <@${track.requestedBy}>`)
      .catch(() => {})
  } catch (err) {
    logger.error(`Lỗi stream: ${err.message}`)
    queue.textChannel
      ?.send(`❌ Không phát được **${track.title}**: ${err.message}`)
      .catch(() => {})
    playNext(guildId)
  }
}

const addTrack = async (guildId, voiceChannel, textChannel, query, requestedBy) => {
  let track

  if (YT_URL_RE.test(query)) {
    const info = await ytdlp(query, {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      skipDownload: true,
    })
    track = {
      url: info.webpage_url || query,
      title: info.title || 'Unknown',
      duration: info.duration || 0,
      requestedBy,
    }
  } else {
    const result = await YouTube.searchOne(query, 'video')
    if (!result) throw new Error('Không tìm thấy kết quả')
    track = {
      url: result.url,
      title: result.title,
      duration: Math.floor((result.duration || 0) / 1000),
      requestedBy,
    }
  }

  let queue = queues.get(guildId)
  if (!queue) {
    queue = createQueue(guildId, voiceChannel, textChannel)
  }

  queue.tracks.push(track)

  if (!queue.playing) {
    playNext(guildId)
    return { track, position: 0 }
  }

  return { track, position: queue.tracks.length }
}

const skip = (guildId) => {
  const queue = queues.get(guildId)
  if (!queue || !queue.current) return null
  const skipped = queue.current
  queue.player.stop()
  return skipped
}

const destroyQueue = (guildId) => {
  const queue = queues.get(guildId)
  if (!queue) return
  try {
    if (queue.subprocess) queue.subprocess.kill()
  } catch {}
  try {
    queue.player.stop()
    queue.connection.destroy()
  } catch {}
  queues.delete(guildId)
}

module.exports = { getQueue, addTrack, skip, destroyQueue }
