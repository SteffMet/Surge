const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'surge-backend' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const base = `${timestamp} [${level}] ${message}`;
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return stack ? `${base}\n${stack}${metaStr}` : `${base}${metaStr}`;
        })
      )
    })
  ]
});

module.exports = logger;