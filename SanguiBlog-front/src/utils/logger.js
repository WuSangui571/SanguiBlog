const isDev = Boolean(import.meta.env?.DEV);

const sampleRateRaw = import.meta.env?.VITE_LOG_SAMPLE_RATE;
const sampleRate = Number.isFinite(Number(sampleRateRaw))
  ? Math.max(0, Math.min(1, Number(sampleRateRaw)))
  : (isDev ? 1 : 0.12);

const shouldSample = () => {
  if (isDev) return true;
  return Math.random() < sampleRate;
};

const safeConsole = (method, args) => {
  try {
    // eslint-disable-next-line no-console
    (console[method] || console.log).apply(console, args);
  } catch {
    // ignore
  }
};

const tryCapture = (error, context = {}) => {
  try {
    if (typeof window === "undefined") return;
    const sentry = window.Sentry;
    if (!sentry || typeof sentry.captureException !== "function") return;
    if (error instanceof Error) {
      sentry.captureException(error, { extra: context });
    }
  } catch {
    // ignore
  }
};

const logger = {
  debug: (...args) => {
    if (!isDev) return;
    safeConsole("debug", args);
  },
  info: (...args) => {
    if (!isDev) return;
    safeConsole("info", args);
  },
  warn: (...args) => {
    if (!shouldSample()) return;
    safeConsole("warn", args);
  },
  error: (message, error, context = {}) => {
    if (message !== undefined) {
      safeConsole("error", [message]);
    }
    if (error) {
      safeConsole("error", [error]);
      tryCapture(error, context);
    }
  },
};

export default logger;

