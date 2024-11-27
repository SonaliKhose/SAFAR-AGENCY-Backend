// utils/logger.js
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const path = require('path');

// Custom format for logs
const customFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
    level: 'info',
    format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
    ),
    transports: [
        new transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error' }),
        new transports.File({ filename: path.join(__dirname, '../logs/combined.log') }),
    ],
});

// If not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: combine(
            colorize(),
            customFormat
        )
    }));
}

module.exports = logger;
