# Discord Bot

Bot Discord viết bằng [discord.js](https://discord.js.org/) v14 (CommonJS), cấu trúc auto-loader: thả file vào đúng thư mục là bot tự nhận.

Tính năng hiện có:

- **Tiện ích**: `/ping`, `/help`, `/userinfo`, `/avatar`
- **Nhạc** (YouTube qua `yt-dlp`): `/play`, `/skip`, `/stop`, `/queue` — queue per-guild, tự rời voice sau 30s khi hết bài
- **TTS**: `/say` đọc text trong voice channel (7 ngôn ngữ, Google TTS)
- **Chào mừng**: `/welcome` — bật/tắt, set kênh, custom message với biến `{user}` `{server}` `{memberCount}`…

## Cài đặt

```bash
npm install
cp .env.example .env   # rồi điền TOKEN + CLIENT_ID
```

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `TOKEN` | ✅ | Token bot từ Discord Developer Portal |
| `CLIENT_ID` | ✅ | Application ID của bot |
| `GUILD_ID` | ❌ | Set để deploy command theo guild (instant); để trống = global (cache ~1h) |
| `CHANNEL_ID` | ❌ | Kênh bot gửi tin nhắn test khi khởi động |
| `NODE_ENV` | ❌ | `development` (mặc định) hoặc `production` |

### Bật privileged intent

Tính năng chào mừng cần **`SERVER MEMBERS INTENT`** trên Discord Developer Portal → Bot → Privileged Gateway Intents. Không bật → event `guildMemberAdd` không bao giờ fire (silent).

## Chạy

```bash
npm run deploy   # đăng ký slash commands với Discord (chạy lại mỗi khi thêm/sửa command)
npm run dev      # dev mode (nodemon auto-reload)
npm start        # production
```

## Cấu trúc

```
src/
├── commands/   # Slash commands — 1 file = 1 lệnh, auto-load
├── events/     # Event handlers (ready, interactionCreate, guildMemberAdd, ...)
├── handlers/   # Loader cho commands & events
├── config/     # Đọc .env, validate biến bắt buộc
└── utils/      # logger, musicQueue, welcomeStore
data/           # Runtime state per-guild (vd. welcome.json) — gitignored
deploy-commands.js   # Script standalone, không phải part của runtime
```

## Thêm command mới

```js
// src/commands/hello.js
const { SlashCommandBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder().setName('hello').setDescription('Lời chào'),
  execute: async (interaction) => {
    await interaction.reply('Xin chào! 👋')
  },
}
```

Sau đó `npm run deploy` để Discord nhận command.

## Thêm event mới

Tạo file trong `src/events/`, export `{ name, once, execute }`. Dùng enum `Events` của discord.js:

```js
const { Events } = require('discord.js')

module.exports = {
  name: Events.MessageCreate,
  once: false,
  execute: async (message, client) => { /* ... */ },
}
```

Nếu event cần intent mới (vd. `MessageContent`), thêm vào array `intents` ở `src/index.js` **và** bật ở Discord Developer Portal nếu là privileged.

## Lint & format

```bash
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
npm run format     # Prettier format toàn bộ
```

Quy ước format: không semicolon, single quotes, trailing comma ES5 (xem `.prettierrc.json`).

## Hướng dẫn cho Claude Code

Xem [`CLAUDE.md`](./CLAUDE.md) — chi tiết về luồng khởi động, contract command/event, music subsystem, welcome subsystem, persistent state pattern.
