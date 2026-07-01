const ALLOWED_VISIBILITY_STATES = new Set(['visible', 'hidden', 'prerender', 'unloaded']);

const finitePositiveDimension = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
};

const buildSize = (width, height) => {
  const w = finitePositiveDimension(width);
  const h = finitePositiveDimension(height);
  return w && h ? `${w}x${h}` : null;
};

const resolveTimezone = (scope) => {
  try {
    const intl = scope?.Intl || globalThis.Intl;
    const timezone = intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
    return typeof timezone === 'string' && timezone.trim() ? timezone.trim() : null;
  } catch {
    return null;
  }
};

const resolveDevicePixelRatio = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 10) {
    return null;
  }
  return Math.round(number * 100) / 100;
};

const resolveVisibilityState = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return ALLOWED_VISIBILITY_STATES.has(normalized) ? normalized : null;
};

const resolveWebdriver = (value) => {
  if (typeof value !== 'boolean') return null;
  return value;
};

export const collectAnalyticsClientEnvironment = (scope = globalThis) => {
  const current = scope?.window || scope || {};
  const doc = current.document || scope?.document || {};
  const nav = current.navigator || scope?.navigator || {};
  const screen = current.screen || scope?.screen || {};

  return {
    timezone: resolveTimezone(current),
    screenSize: buildSize(screen.width, screen.height),
    viewportSize: buildSize(current.innerWidth, current.innerHeight),
    devicePixelRatio: resolveDevicePixelRatio(current.devicePixelRatio),
    webdriver: resolveWebdriver(nav.webdriver),
    visibilityState: resolveVisibilityState(doc.visibilityState),
    referrerClient: typeof doc.referrer === 'string' && doc.referrer.trim() ? doc.referrer.trim() : null,
  };
};
