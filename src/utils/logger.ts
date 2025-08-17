// src/utils/logger.ts
// Browser-adapted centralized logging system from oshea
// Lightweight routing layer for React/browser environment

// Global debug mode state
let debugMode: boolean = false;

// Logger configuration for browser environment
interface LoggerConfig {
  showContext: boolean;
  showTimestamp: boolean;
  contextStyle: 'prefix' | 'suffix' | 'none';
  showCaller: boolean;
  showStack: boolean;
  enrichErrors: boolean;
  stackDepth: number;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'detail' | 'fatal' | 'validation';

interface LoggerOptions {
  level?: LogLevel;
  context?: string;
  meta?: Record<string, any>;
  [key: string]: any;
}

interface LoggerMeta {
  context?: string;
  config?: LoggerConfig;
  caller?: string;
  stack?: string[];
  errorCategory?: string;
  hint?: string;
  [key: string]: any;
}

const loggerConfig: LoggerConfig = {
  showContext: true,      // Show context in formatted output
  showTimestamp: false,   // Show timestamp in formatted output
  contextStyle: 'prefix', // 'prefix', 'suffix', 'none'
  // Enhanced debugging features
  showCaller: false,      // Show file:line caller info
  showStack: false,       // Show stack traces for errors
  enrichErrors: false,    // Auto-categorize errors and add hints
  stackDepth: 3           // Number of stack frames to show
};

// Browser-adapted color theme using CSS styles
const theme = {
  error: (msg: string) => `%c${msg}`,
  warn: (msg: string) => `%c${msg}`,
  success: (msg: string) => `%c${msg}`,
  info: (msg: string) => `%c${msg}`,
  validation: (msg: string) => `%c${msg}`,
  detail: (msg: string) => `%c${msg}`,
  debug: (msg: string) => `%c${msg}`
};

// CSS styles for browser console colors
const styles = {
  error: 'color: #fb4934; font-weight: bold;',
  warn: 'color: #fabd2f; font-weight: bold;',
  success: 'color: #b8bb26; font-weight: bold;',
  info: 'color: #83a598; font-weight: normal;',
  validation: 'color: #d3869b; font-weight: normal;',
  detail: 'color: #928374; font-weight: normal;',
  debug: 'color: #665c54; font-weight: normal;'
};

// Returns a styled message for the given level
function colorForLevel(level: LogLevel, message: string) {
  if (level === 'error' || level === 'fatal') return { msg: theme.error(message), style: styles.error };
  if (level === 'warn') return { msg: theme.warn(message), style: styles.warn };
  if (level === 'success') return { msg: theme.success(message), style: styles.success };
  if (level === 'info') return { msg: theme.info(message), style: styles.info };
  if (level === 'validation') return { msg: theme.validation(message), style: styles.validation };
  if (level === 'detail') return { msg: theme.detail(message), style: styles.detail };
  if (level === 'debug') return { msg: theme.debug(message), style: styles.debug };
  return { msg: message, style: '' };
}

// Format context prefix based on configuration
function formatContext(context: string | undefined, config: LoggerConfig = loggerConfig): string {
  if (!context || !config.showContext) return '';

  const timestamp = config.showTimestamp ? ` ${new Date().toISOString()}` : '';

  if (config.contextStyle === 'prefix') {
    return `[${context}${timestamp}] `;
  } else if (config.contextStyle === 'suffix') {
    return ` [${context}${timestamp}]`;
  }

  return '';
}

// Enhanced message formatter for browser environment
function enhanceMessage(message: string, options: LoggerOptions, level: LogLevel, config: LoggerConfig): Partial<LoggerMeta> {
  const enhanced: Partial<LoggerMeta> = {};

  if (config.showCaller) {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Skip our logger functions and find the actual caller
        const callerLine = lines.find((line, index) => 
          index > 2 && !line.includes('logger.ts') && line.includes('at ')
        );
        if (callerLine) {
          const match = callerLine.match(/at\s+.*\s+\((.+):(\d+):(\d+)\)/);
          if (match) {
            const [, file, line] = match;
            enhanced.caller = `${file.split('/').pop()}:${line}`;
          }
        }
      }
    } catch (e) {
      // Silently fail if stack trace parsing doesn't work
    }
  }

  if (config.showStack && (level === 'error' || level === 'warn')) {
    try {
      const stack = new Error().stack;
      if (stack) {
        enhanced.stack = stack.split('\n').slice(1, config.stackDepth + 1);
      }
    } catch (e) {
      // Silently fail if stack trace doesn't work
    }
  }

  if (config.enrichErrors && (level === 'error' || level === 'warn')) {
    // Basic error categorization for browser environment
    if (typeof message === 'string') {
      if (message.includes('fetch') || message.includes('network')) {
        enhanced.errorCategory = 'network';
        enhanced.hint = 'Check network connection and API endpoints';
      } else if (message.includes('parse') || message.includes('JSON')) {
        enhanced.errorCategory = 'parsing';
        enhanced.hint = 'Check data format and parsing logic';
      } else if (message.includes('permission') || message.includes('auth')) {
        enhanced.errorCategory = 'auth';
        enhanced.hint = 'Check authentication and permissions';
      } else {
        enhanced.errorCategory = 'general';
      }
    }
  }

  return enhanced;
}

// Browser-adapted formatter
function formatApp(level: LogLevel, message: string, meta: LoggerMeta = {}): void {
  const { context, config = loggerConfig, caller, stack, errorCategory, hint } = meta;

  const contextPrefix = formatContext(context, config);
  let formattedMessage = config.contextStyle === 'suffix'
    ? message + formatContext(context, config)
    : contextPrefix + message;

  const { msg, style } = colorForLevel(level, formattedMessage);

  // Browser console output with styling
  if (style) {
    console.log(msg, style);
  } else {
    console.log(msg);
  }

  // Enterprise-grade structured logging for machine readability
  const structuredLog = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    context: context || 'Unknown',
    message: formattedMessage,
    session: 'aoife-dev',
    ...meta
  };

  // Also send to server for debugging via fetch (non-blocking)
  try {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(structuredLog)
    }).catch(() => {}); // Silently fail if endpoint doesn't exist
  } catch (e) {
    // Silently fail if fetch not available
  }

  // Add enhanced debugging information
  if (caller) {
    const { msg: callerMsg, style: callerStyle } = colorForLevel('debug', `  (${caller})`);
    console.log(callerMsg, callerStyle);
  }

  if (errorCategory && errorCategory !== 'general') {
    const { msg: catMsg, style: catStyle } = colorForLevel('info', `  [${errorCategory}]`);
    console.log(catMsg, catStyle);
  }

  if (hint) {
    const { msg: hintMsg, style: hintStyle } = colorForLevel('debug', `  Hint: ${hint}`);
    console.log(hintMsg, hintStyle);
  }

  if (stack && Array.isArray(stack)) {
    const { msg: stackMsg, style: stackStyle } = colorForLevel('debug', '  Stack trace:');
    console.log(stackMsg, stackStyle);
    stack.forEach(line => {
      const { msg: lineMsg, style: lineStyle } = colorForLevel('debug', `    ${line.trim()}`);
      console.log(lineMsg, lineStyle);
    });
  }

  if (level === 'fatal') {
    throw new Error(`Fatal error: ${message}`);
  }
}

// Configure logger
function configureLogger(config: Partial<LoggerConfig> = {}): void {
  Object.assign(loggerConfig, config);
}

// Get current logger configuration
function getLoggerConfig(): LoggerConfig {
  return { ...loggerConfig };
}

// Set debug mode globally
function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
  console.log(`Logger debug mode ${enabled ? 'enabled' : 'disabled'}`);
}

// Main logger interface
function logger(message: string, options: LoggerOptions = {}): void {
  const { level = 'info', context, meta = {} } = options;

  // Suppress context for user-facing commands unless debug mode
  if (!debugMode && (level === 'info' || level === 'success')) {
    meta.context = undefined;
  } else {
    meta.context = context;
  }
  meta.config = loggerConfig;

  // Apply enhanced debugging if any enhancement features are enabled
  if (loggerConfig.showCaller || loggerConfig.showStack || loggerConfig.enrichErrors) {
    const enhanced = enhanceMessage(message, options, level, loggerConfig);
    Object.assign(meta, enhanced);
  }

  // Debug mode filtering
  if (level === 'debug' && !debugMode) return;

  return formatApp(level, message, meta);
}

// Convenience aliases for each level
const info = (msg: string, options: Omit<LoggerOptions, 'level'> = {}) => logger(msg, { ...options, level: 'info' });
const warn = (msg: string, options: Omit<LoggerOptions, 'level'> = {}) => logger(msg, { ...options, level: 'warn' });
const error = (msg: string, options: Omit<LoggerOptions, 'level'> = {}) => logger(msg, { ...options, level: 'error' });
const success = (msg: string, options: Omit<LoggerOptions, 'level'> = {}) => logger(msg, { ...options, level: 'success' });
const detail = (msg: string, options: Omit<LoggerOptions, 'level'> = {}) => logger(msg, { ...options, level: 'detail' });
const fatal = (msg: string, options: Omit<LoggerOptions, 'level'> = {}) => logger(msg, { ...options, level: 'fatal' });
const debug = (msg: string, options: Omit<LoggerOptions, 'level'> = {}) => logger(msg, { ...options, level: 'debug' });
const validation = (msg: string, options: Omit<LoggerOptions, 'level'> = {}) => logger(msg, { ...options, level: 'validation' });

// Convenience method for pre-configured loggers with context
function createLoggerFor(context: string) {
  return {
    info: (msg: string, options: Omit<LoggerOptions, 'level' | 'context'> = {}) => logger(msg, { ...options, level: 'info', context }),
    warn: (msg: string, options: Omit<LoggerOptions, 'level' | 'context'> = {}) => logger(msg, { ...options, level: 'warn', context }),
    error: (msg: string, options: Omit<LoggerOptions, 'level' | 'context'> = {}) => logger(msg, { ...options, level: 'error', context }),
    success: (msg: string, options: Omit<LoggerOptions, 'level' | 'context'> = {}) => logger(msg, { ...options, level: 'success', context }),
    detail: (msg: string, options: Omit<LoggerOptions, 'level' | 'context'> = {}) => logger(msg, { ...options, level: 'detail', context }),
    fatal: (msg: string, options: Omit<LoggerOptions, 'level' | 'context'> = {}) => logger(msg, { ...options, level: 'fatal', context }),
    debug: (msg: string, options: Omit<LoggerOptions, 'level' | 'context'> = {}) => logger(msg, { ...options, level: 'debug', context }),
    validation: (msg: string, options: Omit<LoggerOptions, 'level' | 'context'> = {}) => logger(msg, { ...options, level: 'validation', context }),
    log: (msg: string, options: Omit<LoggerOptions, 'context'> = {}) => logger(msg, { ...options, context })
  };
}

export {
  // Debug mode control
  setDebugMode,
  // Logger configuration
  configureLogger,
  getLoggerConfig,
  // Main logger interface
  logger,
  // Convenience method for pre-configured loggers
  createLoggerFor,
  // Convenience aliases for each level
  info,
  warn,
  error,
  success,
  detail,
  fatal,
  debug,
  validation
};

export default {
  setDebugMode,
  configureLogger,
  getLoggerConfig,
  logger,
  for: createLoggerFor,
  info,
  warn,
  error,
  success,
  detail,
  fatal,
  debug,
  validation
};