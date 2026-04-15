export const REDIRECT_SOURCE_QUERY_KEYS = ['sg_redirect_from', 'redirect_from'];

const safeTrim = (value, maxLen) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
};

const parseSourceUrl = (rawSource) => {
  const raw = safeTrim(rawSource, 512);
  if (!raw) return null;

  const candidates = raw.includes('://') ? [raw] : [`https://${raw.replace(/^\/+/, '')}`];
  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname) {
        return parsed;
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null;
};

const currentHostname = (currentOrigin) => {
  try {
    return new URL(currentOrigin).hostname.toLowerCase();
  } catch {
    return '';
  }
};

export const buildRedirectSourceMeta = (rawSource, currentOrigin = '') => {
  const parsed = parseSourceUrl(rawSource);
  if (!parsed) return null;

  const sourceHostname = parsed.hostname.toLowerCase();
  if (sourceHostname && sourceHostname === currentHostname(currentOrigin)) {
    return null;
  }

  return {
    referrer: parsed.href,
    sourceLabel: `来自重定向：${parsed.host}`,
  };
};

export const resolveRedirectSourceMeta = (search = '', currentOrigin = '') => {
  if (!search) return null;
  let params;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }

  for (const key of REDIRECT_SOURCE_QUERY_KEYS) {
    const values = params.getAll(key);
    const value = values.length > 0 ? values[values.length - 1] : '';
    const meta = buildRedirectSourceMeta(value, currentOrigin);
    if (meta) return meta;
  }
  return null;
};

export const getRedirectSourceMeta = () => {
  if (typeof window === 'undefined') return null;
  return resolveRedirectSourceMeta(window.location?.search || '', window.location?.origin || '');
};
