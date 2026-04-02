type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  context?: string;
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private formatLog(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
  }

  private output(entry: LogEntry) {
    // Store in memory for debugging
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development
    if (this.isDev) {
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
      if (entry.data) {
        console.log(prefix, entry.message, entry.data);
      } else {
        console.log(prefix, entry.message);
      }
    }
  }

  debug(message: string, data?: any) {
    this.output(this.formatLog('debug', message, data));
  }

  info(message: string, data?: any) {
    this.output(this.formatLog('info', message, data));
  }

  warn(message: string, data?: any) {
    this.output(this.formatLog('warn', message, data));
  }

  error(message: string, data?: any) {
    this.output(this.formatLog('error', message, data));
  }

  getLogs(level?: LogLevel, limit: number = 100): LogEntry[] {
    let filtered = this.logs;
    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }
    return filtered.slice(-limit);
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
