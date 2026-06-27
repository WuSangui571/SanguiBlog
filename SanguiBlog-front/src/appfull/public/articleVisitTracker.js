// 文章浏览时长 / 活跃浏览时长前端纯 helper。
// 仅含可被 Node 直接 require 的纯逻辑，不依赖浏览器 API（浏览器 API 由调用方在 effect 中守护）。

export const MAX_VISIT_DURATION_SECONDS = 7200;
export const HEARTBEAT_INTERVAL_MS = 15000;

const safeNumber = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

export const createVisitId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through
    }
  }
  const fallback = () => Math.random().toString(36).slice(2, 10);
  return `v-${Date.now().toString(36)}-${fallback()}${fallback()}`;
};

export const sanitizeDurationSeconds = (seconds, maxSeconds = MAX_VISIT_DURATION_SECONDS) => {
  const value = safeNumber(Number(seconds));
  if (value === null || value < 0) return 0;
  const max = typeof maxSeconds === "number" && maxSeconds > 0 ? maxSeconds : MAX_VISIT_DURATION_SECONDS;
  return Math.min(value, max);
};

export const calculateTotalDurationSeconds = (startMs, nowMs, maxSeconds = MAX_VISIT_DURATION_SECONDS) => {
  const start = safeNumber(Number(startMs));
  const now = safeNumber(Number(nowMs));
  if (start === null || now === null || now < start) return 0;
  const seconds = Math.floor((now - start) / 1000);
  return sanitizeDurationSeconds(seconds, maxSeconds);
};

export const formatVisitDuration = (seconds) => {
  const value = sanitizeDurationSeconds(seconds);
  if (value < 60) return `${value}秒`;
  if (value < 3600) {
    const minutes = Math.floor(value / 60);
    const secs = value % 60;
    return `${minutes}分${String(secs).padStart(2, "0")}秒`;
  }
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${hours}小时${String(minutes).padStart(2, "0")}分`;
};

/**
 * 创建一个活跃时长累计器：仅在“可见”状态下累计秒数。
 * 调用方需在 visibilitychange 事件中调用 markVisibility(state)，
 * 并在 heartbeat 时调用 snapshot() 获取当前累计秒数。
 */
export const createActiveDurationTracker = (options = {}) => {
  const maxSeconds = typeof options.maxSeconds === "number" && options.maxSeconds > 0
    ? options.maxSeconds
    : MAX_VISIT_DURATION_SECONDS;
  let accumulatedMs = 0;
  let segmentStartMs = null;
  let visible = true;

  const nowMs = () => (typeof options.nowMs === "function" ? options.nowMs() : Date.now());

  const markVisibility = (state) => {
    const isVisible = state === "visible";
    if (isVisible === visible) return;
    const now = nowMs();
    if (visible && segmentStartMs !== null) {
      accumulatedMs += Math.max(0, now - segmentStartMs);
    }
    visible = isVisible;
    segmentStartMs = visible ? now : null;
  };

  const start = () => {
    visible = true;
    segmentStartMs = nowMs();
  };

  const snapshot = () => {
    let total = accumulatedMs;
    if (visible && segmentStartMs !== null) {
      total += Math.max(0, nowMs() - segmentStartMs);
    }
    return sanitizeDurationSeconds(Math.floor(total / 1000), maxSeconds);
  };

  const stop = () => {
    if (visible && segmentStartMs !== null) {
      accumulatedMs += Math.max(0, nowMs() - segmentStartMs);
      segmentStartMs = null;
    }
    return sanitizeDurationSeconds(Math.floor(accumulatedMs / 1000), maxSeconds);
  };

  return { start, markVisibility, snapshot, stop };
};

/**
 * 解析后台访问日志记录的浏览时长（秒），优先级：
 * durationSeconds > activeDurationSeconds > totalDurationSeconds > null。
 */
export const resolveDisplayDurationSeconds = (visit) => {
  if (!visit) return null;
  if (typeof visit.durationSeconds === "number" && visit.durationSeconds >= 0) {
    return visit.durationSeconds;
  }
  if (typeof visit.activeDurationSeconds === "number" && visit.activeDurationSeconds >= 0) {
    return visit.activeDurationSeconds;
  }
  if (typeof visit.totalDurationSeconds === "number" && visit.totalDurationSeconds >= 0) {
    return visit.totalDurationSeconds;
  }
  return null;
};

export const formatVisitDurationFromRecord = (visit) => {
  const seconds = resolveDisplayDurationSeconds(visit);
  if (seconds === null) return "-";
  return formatVisitDuration(seconds);
};
