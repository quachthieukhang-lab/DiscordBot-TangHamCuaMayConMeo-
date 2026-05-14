# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Chạy bot dev (nodemon auto-reload)
npm start        # Chạy bot production
npm run deploy   # Đăng ký slash commands với Discord API
npm run lint     # ESLint check
npm run lint:fix # ESLint auto-fix
npm run format   # Prettier format toàn bộ
```

Sau khi thêm/sửa/xóa file trong `src/commands/`, **phải chạy `npm run deploy`** để Discord nhận command mới. Nếu `GUILD_ID` được set, commands xuất hiện ngay; nếu không (global) sẽ mất tới 1 giờ do Discord cache.

## Architecture

Discord bot (discord.js v14, CommonJS). Cấu trúc auto-loader: thêm file mới vào đúng thư mục là bot tự nhận, **không cần đăng ký thủ công ở entry point**.

**Luồng khởi động** (`src/index.js`):
1. `config/config.js` đọc `.env` và **throw nếu thiếu `TOKEN` hoặc `CLIENT_ID`** — fail-fast, không có fallback.
2. `handlers/commandHandler.js` quét `src/commands/*.js`, đọc `module.exports.data` (SlashCommandBuilder) và `execute`, lưu vào `client.commands` (Collection).
3. `handlers/eventHandler.js` quét `src/events/*.js`, đăng ký với `client.on/once` tùy field `once`.
4. `client.login()`.

**Contract của command file** (`src/commands/*.js`):
```js
module.exports = {
  data: new SlashCommandBuilder().setName('x').setDescription('...'),
  execute: async (interaction) => { /* ... */ }
}
```
Thiếu `data` hoặc `execute` → bị skip với warning, không crash.

**Contract của event file** (`src/events/*.js`):
```js
module.exports = {
  name: Events.X,        // dùng enum Events từ discord.js
  once: true | false,
  execute: async (...args, client) => { /* client luôn được pass cuối */ }
}
```

**Slash command dispatch** chạy trong `src/events/interactionCreate.js`, lookup `client.commands.get(name)` và gọi `execute(interaction)`. Lỗi được catch, reply ephemeral.

**`deploy-commands.js`** là script standalone (không phải part của runtime), đọc cùng folder `src/commands/` và `PUT` lên Discord REST API. Route phụ thuộc `GUILD_ID`: có → `applicationGuildCommands` (instant), không → `applicationCommands` (global).

**Intents hiện hành** (`src/index.js`): `Guilds`, `GuildVoiceStates`, `GuildMembers`. `GuildMembers` là **privileged intent** — bắt buộc bật `SERVER MEMBERS INTENT` trên Discord Developer Portal, nếu không event `guildMemberAdd` không bao giờ fire mà cũng không lỗi rõ ràng.

## Music subsystem

`src/utils/musicQueue.js` quản lý state nhạc per-guild trong một `Map`, dùng chung bởi `/play`, `/skip`, `/stop`, `/queue`. Hiểu trước khi sửa:

- Stream: `yt-dlp exec` → stdout pipe → `createAudioResource(StreamType.WebmOpus)`. Format yêu cầu `bestaudio[ext=webm+acodec=opus]/bestaudio`. `ffmpeg-static` và `opusscript` đã có trong deps.
- Resolve: URL YouTube đi qua `ytdlp --dump-single-json`; query text đi qua `youtube-sr.searchOne`.
- Vòng đời: `addTrack` lazy-create queue, `player` event `Idle` → `playNext`; khi `tracks` rỗng bot tự `destroyQueue` sau **30s** (gửi cảnh báo vào `textChannel`).
- Subprocess `yt-dlp` được track ở `queue.subprocess` và bị `kill()` ở mỗi `Idle`/`destroyQueue` — không leak process.
- **Invariant**: `/say` (TTS, `src/commands/say.js`) gọi `getQueue(guildId)` và **từ chối chạy** khi đang phát nhạc. Nếu thêm command voice khác, follow pattern này — đừng để hai source âm thanh tranh nhau cùng `VoiceConnection`.

## Welcome subsystem

Chào mừng member mới, có toggle on/off per-guild.

- Persist: `src/utils/welcomeStore.js` đọc/ghi `data/welcome.json` (folder tự tạo lazy). Cache trong RAM, write-through ngay khi `update()`.
- `get(guildId)` luôn merge với `DEFAULTS` nên caller không cần null-check field.
- Event `src/events/guildMemberAdd.js` tự skip nếu `!enabled || !channelId` hoặc bot thiếu `SendMessages`/`EmbedLinks`. Skip cả bot accounts.
- Command `/welcome` (`src/commands/welcome.js`) yêu cầu `ManageGuild`. Subcommands: `toggle`, `channel`, `message`, `status`, `test`. Template hỗ trợ biến `{user}` `{username}` `{tag}` `{server}` `{memberCount}` — render qua `welcomeStore.renderMessage()`.

## Persistent state pattern

Khi thêm feature có state cần sống qua restart:

- **Ephemeral** (nhạc, session): `Map` keyed bởi `guildId`, không cần persist.
- **Persistent** (config, settings): JSON file dưới `data/<feature>.json` theo pattern của `welcomeStore.js` — lazy `mkdirSync({ recursive: true })`, cache trong module, hàm `get/update` luôn merge với `DEFAULTS`.

## Conventions

- Format: theo `.prettierrc.json` (chạy `npm run format`). Không tự sửa style trái với config.
- Logger: `require('./utils/logger')` thay cho `console.*`. Levels: `info/success/warn/error/debug`. `debug` chỉ in khi `NODE_ENV !== 'production'`.
- Khi thêm intent mới: thêm vào array `intents` trong `src/index.js` **và** bật ở Discord Developer Portal nếu là Privileged.
- `CHANNEL_ID` và `GUILD_ID` là optional; code phải null-check trước khi dùng.
- Reply lỗi/ephemeral dùng `MessageFlags.Ephemeral` (không dùng `ephemeral: true` đã deprecated).
