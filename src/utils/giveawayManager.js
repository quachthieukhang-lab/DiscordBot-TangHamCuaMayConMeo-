const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const store = require('./giveawayStore')
const logger = require('./logger')

const timers = new Map()
const refreshTimers = new Map()
const REFRESH_DEBOUNCE_MS = 2500

const UNITS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
}

const parseDuration = (input) => {
  if (!input) return null
  const re = /(\d+)\s*(s|m|h|d|w)/gi
  let total = 0
  let matched = false
  for (const m of input.matchAll(re)) {
    matched = true
    total += Number(m[1]) * UNITS[m[2].toLowerCase()]
  }
  return matched ? total : null
}

const buildEmbed = (g, { ended } = {}) => {
  const endTs = Math.floor(g.endsAt / 1000)
  return new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY 🎉')
    .setColor(ended ? 0x808080 : 0xf1c40f)
    .setDescription(
      [
        `**Phần thưởng:** ${g.prize}`,
        `**Số người thắng:** ${g.winnersCount}`,
        ended
          ? `**Đã kết thúc** <t:${endTs}:R>`
          : `**Kết thúc:** <t:${endTs}:R> (<t:${endTs}:f>)`,
        `**Host:** <@${g.hostId}>`,
        `**Lượt tham gia:** ${g.entries.length}`,
      ].join('\n')
    )
    .setFooter({ text: `Message ID: ${g.messageId}` })
}

const buildRow = (messageId, disabled = false) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway:enter:${messageId}`)
      .setLabel('Tham gia')
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled)
  )

const pickWinners = (entries, count) => {
  const pool = [...entries]
  const winners = []
  while (winners.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length)
    winners.push(pool.splice(idx, 1)[0])
  }
  return winners
}

const clearTimer = (messageId) => {
  const t = timers.get(messageId)
  if (t) {
    clearTimeout(t)
    timers.delete(messageId)
  }
}

const refreshEmbed = async (client, messageId) => {
  refreshTimers.delete(messageId)
  const g = store.get(messageId)
  if (!g || g.ended) return
  try {
    const channel = await client.channels.fetch(g.channelId).catch(() => null)
    if (!channel) return
    const msg = await channel.messages.fetch(messageId).catch(() => null)
    if (!msg) return
    await msg
      .edit({ embeds: [buildEmbed(g)], components: [buildRow(messageId)] })
      .catch(() => {})
  } catch (err) {
    logger.error(`Lỗi refresh giveaway ${messageId}: ${err.message}`)
  }
}

const scheduleRefresh = (client, messageId) => {
  if (refreshTimers.has(messageId)) return
  const t = setTimeout(() => refreshEmbed(client, messageId), REFRESH_DEBOUNCE_MS)
  refreshTimers.set(messageId, t)
}

const endGiveaway = async (client, messageId) => {
  const g = store.get(messageId)
  if (!g || g.ended) return
  const updated = store.update(messageId, { ended: true })
  clearTimer(messageId)

  try {
    const channel = await client.channels.fetch(g.channelId).catch(() => null)
    if (!channel) {
      logger.warn(`Giveaway ${messageId}: không tìm thấy kênh ${g.channelId}`)
      return
    }
    const msg = await channel.messages.fetch(messageId).catch((err) => {
      logger.warn(`Giveaway ${messageId}: không fetch được message — ${err.message}`)
      return null
    })
    const winners = pickWinners(updated.entries, updated.winnersCount)
    logger.info(
      `Kết thúc giveaway ${messageId}: ${updated.entries.length} entries, winners=${winners.length}`
    )

    if (msg) {
      try {
        await msg.edit({
          embeds: [buildEmbed(updated, { ended: true })],
          components: [buildRow(messageId, true)],
        })
      } catch (err) {
        logger.warn(`Không edit được message giveaway: ${err.message}`)
      }
    }

    const messageLink = msg
      ? `https://discord.com/channels/${g.guildId}/${g.channelId}/${messageId}`
      : null

    try {
      if (winners.length === 0) {
        await channel.send({
          content: `😢 Giveaway **${updated.prize}** đã kết thúc nhưng không có ai tham gia.${
            messageLink ? `\n${messageLink}` : ''
          }`,
          allowedMentions: { parse: [] },
        })
      } else {
        const mentions = winners.map((id) => `<@${id}>`).join(', ')
        await channel.send({
          content: `🎉 Chúc mừng ${mentions} đã thắng **${updated.prize}**!${
            messageLink ? `\n${messageLink}` : ''
          }`,
          allowedMentions: { users: winners },
        })
        logger.success(`Đã thông báo winner giveaway ${messageId}: ${winners.join(', ')}`)
      }
    } catch (err) {
      logger.error(`Không gửi được thông báo winner: ${err.message}`)
    }
  } catch (err) {
    logger.error(`Lỗi khi kết thúc giveaway ${messageId}: ${err.message}`)
  }
}

const MAX_TIMEOUT = 2_000_000_000

const scheduleGiveaway = (client, g) => {
  clearTimer(g.messageId)
  const delay = g.endsAt - Date.now()
  if (delay <= 0) {
    endGiveaway(client, g.messageId)
    return
  }
  const wait = Math.min(delay, MAX_TIMEOUT)
  const t = setTimeout(() => {
    const current = store.get(g.messageId)
    if (!current || current.ended) return
    if (current.endsAt - Date.now() > 0) {
      scheduleGiveaway(client, current)
    } else {
      endGiveaway(client, g.messageId)
    }
  }, wait)
  timers.set(g.messageId, t)
}

const initOnReady = (client) => {
  const active = store.listActive()
  for (const g of active) {
    scheduleGiveaway(client, g)
    // Sync embed với entries trên disk (timer ở process cũ đã chết khi restart)
    refreshEmbed(client, g.messageId).catch(() => {})
  }
  if (active.length > 0) {
    logger.info(`Đã khôi phục ${active.length} giveaway đang chạy`)
  }
}

const startGiveaway = async ({
  client,
  channel,
  prize,
  winnersCount,
  durationMs,
  hostId,
}) => {
  const endsAt = Date.now() + durationMs
  const placeholder = await channel.send({ content: '🎉 Đang tạo giveaway...' })
  const record = {
    guildId: channel.guildId,
    channelId: channel.id,
    messageId: placeholder.id,
    prize,
    hostId,
    winnersCount,
    endsAt,
    entries: [],
    ended: false,
    createdAt: Date.now(),
  }
  store.create(record)
  await placeholder.edit({
    content: '',
    embeds: [buildEmbed(record)],
    components: [buildRow(placeholder.id)],
  })
  scheduleGiveaway(client, record)
  return record
}

const rerollGiveaway = async (client, messageId) => {
  const g = store.get(messageId)
  if (!g) return { ok: false, reason: 'not_found' }
  if (!g.ended) return { ok: false, reason: 'not_ended' }
  if (g.entries.length === 0) return { ok: false, reason: 'no_entries' }
  const winners = pickWinners(g.entries, g.winnersCount)
  const channel = await client.channels.fetch(g.channelId).catch(() => null)
  if (!channel) return { ok: false, reason: 'no_channel' }
  const mentions = winners.map((id) => `<@${id}>`).join(', ')
  const messageLink = `https://discord.com/channels/${g.guildId}/${g.channelId}/${messageId}`
  try {
    await channel.send({
      content: `🔄 Reroll giveaway **${g.prize}** — winner mới: ${mentions}!\n${messageLink}`,
      allowedMentions: { users: winners },
    })
  } catch (err) {
    logger.error(`Không gửi được reroll: ${err.message}`)
    return { ok: false, reason: 'send_failed' }
  }
  return { ok: true, winners }
}

module.exports = {
  parseDuration,
  startGiveaway,
  endGiveaway,
  rerollGiveaway,
  scheduleGiveaway,
  scheduleRefresh,
  initOnReady,
}
