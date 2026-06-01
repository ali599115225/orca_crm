import fs from 'fs';
import path from 'path';

// Check if we are in server-side node environment
const isServer = typeof window === 'undefined';

const LOG_FILE_PATH = isServer
  ? path.join(__dirname, '../../logs/system.log')
  : '';

// Ensure logs directory exists on server side
if (isServer) {
  try {
    const logsDir = path.dirname(LOG_FILE_PATH);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }
}

export interface LogContext {
  tenantId?: string;
  subdomain?: string;
  userId?: string;
  action?: string;
  path?: string;
  [key: string]: any;
}

export const systemLogger = {
  info(message: string, context?: LogContext) {
    writeLog('INFO', message, undefined, context);
  },

  warn(message: string, context?: LogContext) {
    writeLog('WARN', message, undefined, context);
  },

  error(message: string, error?: any, context?: LogContext) {
    writeLog('ERROR', message, error, context);
  }
};

function writeLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, error?: any, context?: LogContext) {
  // Kill switch check
  if (process.env.ENABLE_SYSTEM_LOGGER === 'false') {
    return;
  }

  let memoryUsageStr = '0.00 MB';

  if (isServer) {
    try {
      const memory = process.memoryUsage();
      memoryUsageStr = `${(memory.heapUsed / (1024 * 1024)).toFixed(2)} MB`;
    } catch (e) {
      // Ignore process errors
    }
  }

  // Sanitise context to avoid duplication
  const cleanedContext = context ? { ...context } : {};
  const tenantId = cleanedContext.tenantId || 'SYSTEM';
  const subdomain = cleanedContext.subdomain || 'system';
  const userId = cleanedContext.userId || 'system';
  const action = cleanedContext.action || 'SYSTEM_ACTION';
  const reqPath = cleanedContext.path || '';

  delete cleanedContext.tenantId;
  delete cleanedContext.subdomain;
  delete cleanedContext.userId;
  delete cleanedContext.action;
  delete cleanedContext.path;

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    tenantId,
    subdomain,
    userId,
    action,
    path: reqPath,
    message,
    error: error ? {
      name: error.name || 'Error',
      message: error.message || String(error),
      stack: error.stack || ''
    } : undefined,
    context: Object.keys(cleanedContext).length > 0 ? cleanedContext : undefined,
    system: {
      memory: memoryUsageStr
    }
  };

  const jsonLog = JSON.stringify(logEntry);

  // Output to standard console
  if (level === 'ERROR') {
    console.error(`[SYSTEM_LOGGER] ${jsonLog}`);
  } else if (level === 'WARN') {
    console.warn(`[SYSTEM_LOGGER] ${jsonLog}`);
  } else {
    console.log(`[SYSTEM_LOGGER] ${jsonLog}`);
  }

  // Write to log file if on server
  if (isServer && LOG_FILE_PATH) {
    try {
      fs.appendFileSync(LOG_FILE_PATH, jsonLog + '\n', 'utf8');
    } catch (err) {
      console.error('Failed to append to log file:', err);
    }
  }
}
