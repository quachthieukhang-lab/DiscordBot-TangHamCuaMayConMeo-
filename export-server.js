const fs = require('node:fs')
const path = require('node:path')
const { Client, GatewayIntentBits, ChannelType } = require('discord.js')
const config = require('./src/config/config')
const logger = require('./src/utils/logger')

if (!config.guildId) {
  logger.error('Cần GUILD_ID trong .env để biết export server nào')
  process.exit(1)
}

const MESSAGES_PER_CHANNEL = parseInt(process.env.MESSAGES_PER_CHANNEL, 10) || 50
const MAX_MESSAGES_TOTAL = parseInt(process.env.MAX_MESSAGES_TOTAL, 10) || 5000

const CHANNEL_TYPE_NAMES = {
  [ChannelType.GuildText]: 'text',
  [ChannelType.GuildVoice]: 'voice',
  [ChannelType.GuildCategory]: 'category',
  [ChannelType.GuildAnnouncement]: 'announcement',
  [ChannelType.AnnouncementThread]: 'thread-announcement',
  [ChannelType.PublicThread]: 'thread-public',
  [ChannelType.PrivateThread]: 'thread-private',
  [ChannelType.GuildStageVoice]: 'stage',
  [ChannelType.GuildForum]: 'forum',
  [ChannelType.GuildMedia]: 'media',
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

const exportGuild = async (guild) => {
  logger.info('Đang fetch members...')
  await guild.members.fetch()

  const roles = guild.roles.cache
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.hexColor,
      position: r.position,
      mentionable: r.mentionable,
      hoist: r.hoist,
      memberCount: r.members.size,
    }))
    .sort((a, b) => b.position - a.position)

  const channels = guild.channels.cache
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: CHANNEL_TYPE_NAMES[c.type] ?? `unknown(${c.type})`,
      parentId: c.parentId ?? null,
      position: c.position ?? 0,
      topic: 'topic' in c ? c.topic ?? null : null,
      nsfw: 'nsfw' in c ? c.nsfw : false,
    }))
    .sort((a, b) => a.position - b.position)

  const members = guild.members.cache.map((m) => ({
    id: m.id,
    username: m.user.username,
    displayName: m.displayName,
    bot: m.user.bot,
    joinedAt: m.joinedAt?.toISOString() ?? null,
    roleIds: m.roles.cache.filter((r) => r.id !== guild.id).map((r) => r.id),
  }))

  const messages = {}
  let totalMessages = 0

  const textChannels = guild.channels.cache.filter(
    (c) => c.isTextBased && c.isTextBased() && c.viewable
  )

  logger.info(`Đang fetch messages từ ${textChannels.size} text channel(s)...`)

  for (const channel of textChannels.values()) {
    if (totalMessages >= MAX_MESSAGES_TOTAL) {
      logger.warn(`Đã đạt giới hạn ${MAX_MESSAGES_TOTAL} messages, bỏ qua các channel còn lại`)
      break
    }

    try {
      const fetched = await channel.messages.fetch({ limit: MESSAGES_PER_CHANNEL })
      const msgs = [...fetched.values()].reverse().map((m) => ({
        id: m.id,
        authorId: m.author.id,
        authorTag: m.author.tag,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        editedAt: m.editedAt?.toISOString() ?? null,
        attachments: m.attachments.map((a) => ({ name: a.name, url: a.url, size: a.size })),
        embedCount: m.embeds.length,
        reactions: m.reactions.cache.map((r) => ({
          emoji: r.emoji.toString(),
          count: r.count,
        })),
        pinned: m.pinned,
        replyTo: m.reference?.messageId ?? null,
      }))

      if (msgs.length > 0) {
        messages[channel.id] = msgs
        totalMessages += msgs.length
        logger.info(`  #${channel.name}: ${msgs.length} messages`)
      }
    } catch (err) {
      logger.warn(`  #${channel.name}: bỏ qua (${err.message})`)
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    exportConfig: {
      messagesPerChannel: MESSAGES_PER_CHANNEL,
      maxMessagesTotal: MAX_MESSAGES_TOTAL,
      totalMessagesFetched: totalMessages,
    },
    guild: {
      id: guild.id,
      name: guild.name,
      description: guild.description,
      memberCount: guild.memberCount,
      ownerId: guild.ownerId,
      createdAt: guild.createdAt.toISOString(),
      iconUrl: guild.iconURL({ size: 256 }),
      bannerUrl: guild.bannerURL({ size: 1024 }),
      verificationLevel: guild.verificationLevel,
      preferredLocale: guild.preferredLocale,
    },
    stats: {
      roleCount: roles.length,
      channelCount: channels.length,
      memberCount: members.length,
      botCount: members.filter((m) => m.bot).length,
      humanCount: members.filter((m) => !m.bot).length,
    },
    roles,
    channels,
    members,
    messages,
  }
}

client.once('ready', async () => {
  try {
    logger.success(`Đăng nhập: ${client.user.tag}`)

    const guild = await client.guilds.fetch(config.guildId)
    logger.info(`Bắt đầu export "${guild.name}" (${guild.memberCount} members)`)

    const data = await exportGuild(guild)

    const exportsDir = path.join(__dirname, 'exports')
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = path.join(exportsDir, `server-${guild.id}-${timestamp}.json`)
    const latestPath = path.join(exportsDir, `server-${guild.id}-latest.json`)

    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8')
    fs.writeFileSync(latestPath, JSON.stringify(data, null, 2), 'utf-8')

    logger.success(`Xuất xong: ${filename}`)
    logger.success(`Alias: ${latestPath}`)
    logger.info(
      `Tổng: ${data.stats.roleCount} roles • ${data.stats.channelCount} channels • ` +
        `${data.stats.memberCount} members (${data.stats.botCount} bots) • ` +
        `${data.exportConfig.totalMessagesFetched} messages`
    )

    process.exit(0)
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
})

client.login(config.token).catch((err) => {
  logger.error('Không đăng nhập được:')
  logger.error(err)
  process.exit(1)
})
