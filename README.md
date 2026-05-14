# Discord Bot

Bot Discord viết bằng [discord.js](https://discord.js.org/) v14, cấu trúc modular dễ mở rộng.

## Cấu trúc

```
Bot/
├── src/
│   ├── commands/         # Slash commands (mỗi file = 1 lệnh)
│   ├── events/           # Event handlers (ready, interactionCreate, ...)
│   ├── handlers/         # Loader cho commands & events
│   ├── config/           # Cấu hình & biến môi trường
│   ├── utils/            # Tiện ích dùng chung (logger, ...)
│   └── index.js          # Entry point
├── deploy-commands.js    # Script đăng ký slash commands với Discord
├── .env                  # Biến môi trường (KHÔNG commit)
├── .env.example          # Mẫu .env
└── package.json
```

## Cài đặt

```bash
npm install
```

## Cấu hình

Sao chép `.env.example` thành `.env` và điền giá trị:

```bash
cp .env.example .env
```

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `TOKEN` | ✅ | Token bot từ Discord Developer Portal |
| `CLIENT_ID` | ✅ | Application ID của bot |
| `GUILD_ID` | ❌ | ID server để deploy command theo guild (nhanh hơn) |
| `CHANNEL_ID` | ❌ | Kênh để bot gửi tin nhắn test khi khởi động |

## Sử dụng

```bash
# Đăng ký slash commands (chạy lại mỗi khi thêm/sửa command)
npm run deploy

# Chạy bot ở chế độ dev (tự reload khi sửa code)
npm run dev

# Chạy bot ở chế độ production
npm start

# Lint & format
npm run lint
npm run format
```

## Thêm command mới

Tạo file mới trong `src/commands/`, ví dụ `src/commands/hello.js`:

```js
const { SlashCommandBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Lời chào'),
  execute: async (interaction) => {
    await interaction.reply('Xin chào! 👋')
  },
}
```

Sau đó chạy `npm run deploy` để đăng ký với Discord.

## Thêm event mới

Tạo file trong `src/events/`, export `{ name, once, execute }`. Bot sẽ tự nạp khi khởi động.
