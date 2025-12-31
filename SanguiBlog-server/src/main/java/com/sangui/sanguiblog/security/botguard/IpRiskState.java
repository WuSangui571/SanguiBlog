package com.sangui.sanguiblog.security.botguard;

final class IpRiskState {
    final RollingWindowCounter60s total = new RollingWindowCounter60s();
    final RollingWindowCounter60s noCookie = new RollingWindowCounter60s();
    final RollingWindowCounter60s emptyReferer = new RollingWindowCounter60s();
    final RollingWindowCounter60s content = new RollingWindowCounter60s();
    final RollingWindowCounter60s asset = new RollingWindowCounter60s();

    private long lastScoreAtMs = 0;
    private double riskScore = 0.0;

    private long lastRequestAtMs = 0;
    private long lastIntervalMs = 0;
    private int stableIntervalHits = 0;

    private int highRiskStrikes = 0;
    private long blockedUntilMs = 0;

    synchronized double applyScore(long nowMs, double delta, long halfLifeMs) {
        if (lastScoreAtMs > 0 && nowMs > lastScoreAtMs && riskScore > 0 && halfLifeMs > 0) {
            double decay = Math.exp(-(double) (nowMs - lastScoreAtMs) / (double) halfLifeMs * Math.log(2));
            riskScore = riskScore * decay;
        }
        riskScore = clamp(riskScore + delta, 0.0, 100.0);
        lastScoreAtMs = nowMs;
        return riskScore;
    }

    synchronized void touchInterval(long nowMs) {
        if (lastRequestAtMs <= 0) {
            lastRequestAtMs = nowMs;
            lastIntervalMs = 0;
            stableIntervalHits = 0;
            return;
        }
        long interval = Math.max(0, nowMs - lastRequestAtMs);
        lastRequestAtMs = nowMs;

        if (interval >= 200 && interval <= 5000) {
            long last = lastIntervalMs;
            if (last > 0) {
                long diff = Math.abs(interval - last);
                if (diff <= 120) {
                    stableIntervalHits = Math.min(stableIntervalHits + 1, 20);
                } else {
                    stableIntervalHits = Math.max(stableIntervalHits - 1, 0);
                }
            }
            lastIntervalMs = interval;
        }
    }

    synchronized int stableIntervalHits() {
        return stableIntervalHits;
    }

    synchronized int updateHighRiskStrikes(boolean highRisk) {
        if (highRisk) {
            highRiskStrikes = Math.min(highRiskStrikes + 1, 20);
        } else {
            highRiskStrikes = Math.max(highRiskStrikes - 1, 0);
        }
        return highRiskStrikes;
    }

    synchronized void blockUntil(long untilMs) {
        blockedUntilMs = untilMs;
    }

    synchronized long blockedUntilMs() {
        return blockedUntilMs;
    }

    private static double clamp(double v, double min, double max) {
        if (v < min) return min;
        if (v > max) return max;
        return v;
    }
}

