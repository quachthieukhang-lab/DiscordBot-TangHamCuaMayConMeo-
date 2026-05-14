const chalk = require('chalk')

const timestamp = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const format = (tag, color, message) =>
  `${chalk.gray(`[${timestamp()}]`)} ${color(tag)} ${message}`

const logger = {
  info: (msg) => console.log(format('INFO ', chalk.cyan.bold, msg)),
  success: (msg) => console.log(format('OK   ', chalk.green.bold, msg)),
  warn: (msg) => console.warn(format('WARN ', chalk.yellow.bold, msg)),
  error: (msg) => {
    if (msg instanceof Error) {
      console.error(format('ERROR', chalk.red.bold, msg.message))
      if (msg.stack) console.error(chalk.gray(msg.stack))
    } else {
      console.error(format('ERROR', chalk.red.bold, msg))
    }
  },
  debug: (msg) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(format('DEBUG', chalk.magenta.bold, msg))
    }
  },
}

module.exports = logger
