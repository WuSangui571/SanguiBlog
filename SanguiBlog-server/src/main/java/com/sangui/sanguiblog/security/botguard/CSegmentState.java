package com.sangui.sanguiblog.security.botguard;

import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

final class CSegmentState {
    private final ConcurrentHashMap<String, Long> ipLastSeenSec = new ConcurrentHashMap<>();

    int touchAndCount(String ip, long nowSec) {
        if (ip == null || ip.isBlank()) {
            return 0;
        }
        ipLastSeenSec.put(ip, nowSec);
        if (ipLastSeenSec.size() > 4096) {
            cleanup(nowSec);
        }
        return countActive(nowSec);
    }

    private int countActive(long nowSec) {
        int count = 0;
        for (Map.Entry<String, Long> e : ipLastSeenSec.entrySet()) {
            Long sec = e.getValue();
            if (sec != null && nowSec - sec < 60) {
                count++;
            }
        }
        return count;
    }

    private void cleanup(long nowSec) {
        Iterator<Map.Entry<String, Long>> it = ipLastSeenSec.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Long> e = it.next();
            Long sec = e.getValue();
            if (sec == null || nowSec - sec >= 60) {
                it.remove();
            }
        }
    }
}

