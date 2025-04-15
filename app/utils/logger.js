const winston = require('winston');
const { useAzureMonitor } = require('@azure/monitor-opentelemetry');

// Initialize Azure Monitor OpenTelemetry first
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  try {
    useAzureMonitor();
    console.log('Azure Monitor OpenTelemetry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Azure Monitor OpenTelemetry:', error);
  }
}

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Logging methods
const log = {
  error: (message, meta = {}) => {
    logger.error(message, meta);
  },
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  }
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip
    };

    if (res.statusCode >= 500) {
      log.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      log.warn('Request completed with warning', logData);
    } else {
      log.info('Request completed', logData);
    }
  });

  next();
};

module.exports = {
  log,
  requestLogger
}; 