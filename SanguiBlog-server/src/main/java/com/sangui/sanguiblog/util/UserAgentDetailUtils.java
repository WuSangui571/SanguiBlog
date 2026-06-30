package com.sangui.sanguiblog.util;

import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.Set;

public final class UserAgentDetailUtils {

    private static final Set<String> BOT_UA_SIGNATURES = Set.of(
            "bot", "crawler", "spider", "scraper", "archiver", "curl", "wget",
            "python-requests", "httpclient", "apache-httpclient", "okhttp",
            "go-http-client", "postmanruntime", "insomnia", "lighthouse",
            "googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider",
            "yandexbot", "sogou", "exabot", "facebot", "ia_archiver",
            "twitterbot", "rogerbot", "linkedinbot", "embedly", "quora link preview",
            "showyoubot", "outbrain", "pinterest/0.", "developers.google.com/+/web/snippet",
            "slackbot", "vkshare", "w3c_validator", "redditbot", "applebot",
            "whatsapp", "telegrambot", "semrushbot", "ahrefsbot", "dotbot",
            "mj12bot", "barkrowler", "siteauditbot", "blexbot", "dataford"
    );

    private static final Set<String> MOBILE_UA_SUBSTRINGS = Set.of(
            "Mobi", "Android", "iPhone", "iPod", "BlackBerry", "IEMobile",
            "Opera Mini", "Opera Mobi", "webOS", "Windows Phone", "WPDesktop"
    );

    private static final Set<String> TABLET_UA_SUBSTRINGS = Set.of(
            "iPad", "Tablet", "PlayBook", "Silk", "Kindle", "Nexus 7",
            "Nexus 10", "Galaxy Tab", "SM-T"
    );

    private UserAgentDetailUtils() {
    }

    public static boolean isLikelyBot(String ua) {
        if (!StringUtils.hasText(ua)) {
            return false;
        }
        String lower = ua.toLowerCase(Locale.ROOT);
        return BOT_UA_SIGNATURES.stream().anyMatch(lower::contains);
    }

    public static String resolveBotName(String ua) {
        if (!StringUtils.hasText(ua)) {
            return null;
        }
        String lower = ua.toLowerCase(Locale.ROOT);
        if (lower.contains("googlebot")) return "Googlebot";
        if (lower.contains("bingbot")) return "Bingbot";
        if (lower.contains("slurp")) return "Slurp";
        if (lower.contains("duckduckbot")) return "DuckDuckBot";
        if (lower.contains("baiduspider")) return "Baiduspider";
        if (lower.contains("yandexbot")) return "YandexBot";
        if (lower.contains("sogou")) return "Sogou";
        if (lower.contains("exabot")) return "Exabot";
        if (lower.contains("facebot")) return "Facebot";
        if (lower.contains("ia_archiver")) return "ia_archiver";
        if (lower.contains("twitterbot")) return "Twitterbot";
        if (lower.contains("linkedinbot")) return "LinkedInBot";
        if (lower.contains("applebot")) return "Applebot";
        if (lower.contains("ahrefsbot")) return "AhrefsBot";
        if (lower.contains("dotbot")) return "DotBot";
        if (lower.contains("semrushbot")) return "SemrushBot";
        if (lower.contains("mj12bot")) return "MJ12bot";
        if (lower.contains("barkrowler")) return "Barkrowler";
        if (lower.contains("blexbot")) return "BLEXBot";
        if (lower.contains("dataford")) return "DataForSeoBot";
        if (lower.contains("curl")) return "curl";
        if (lower.contains("wget")) return "wget";
        if (lower.contains("python-requests")) return "python-requests";
        if (lower.contains("lighthouse")) return "Lighthouse";
        return "Unknown Bot";
    }

    public static String resolveDeviceType(String ua) {
        if (!StringUtils.hasText(ua)) {
            return "unknown";
        }
        String lower = ua.toLowerCase(Locale.ROOT);
        if (isLikelyBot(ua)) {
            return "bot";
        }
        for (String marker : TABLET_UA_SUBSTRINGS) {
            if (lower.contains(marker.toLowerCase(Locale.ROOT))) {
                return "tablet";
            }
        }
        for (String marker : MOBILE_UA_SUBSTRINGS) {
            if (lower.contains(marker.toLowerCase(Locale.ROOT))) {
                return "mobile";
            }
        }
        return "desktop";
    }

    public static String resolveBrowser(String ua) {
        if (!StringUtils.hasText(ua)) {
            return null;
        }
        String lower = ua.toLowerCase(Locale.ROOT);
        if (lower.contains("edg/") || lower.contains("edge/") || lower.contains("edga/")) return "Edge";
        if (lower.contains("opr/") || lower.contains("opera")) return "Opera";
        if (lower.contains("chrome/") && !lower.contains("edg/")) return "Chrome";
        if (lower.contains("safari/") && !lower.contains("chrome/") && !lower.contains("crios/")) return "Safari";
        if (lower.contains("firefox/")) return "Firefox";
        if (lower.contains("msie ") || lower.contains("trident/")) return "IE";
        if (lower.contains("samsungbrowser")) return "Samsung Browser";
        if (lower.contains("ucbrowser")) return "UC Browser";
        if (lower.contains("qqbrowser")) return "QQ Browser";
        if (lower.contains("wechat") || lower.contains("micromessenger")) return "WeChat";
        return null;
    }

    public static String resolveOs(String ua) {
        if (!StringUtils.hasText(ua)) {
            return null;
        }
        String lower = ua.toLowerCase(Locale.ROOT);
        if (lower.contains("windows nt 10.0") || lower.contains("windows nt 10")) return "Windows 10/11";
        if (lower.contains("windows nt 6.3")) return "Windows 8.1";
        if (lower.contains("windows nt 6.2")) return "Windows 8";
        if (lower.contains("windows nt 6.1")) return "Windows 7";
        if (lower.contains("windows nt")) return "Windows";
        if (lower.contains("mac os x") || lower.contains("macintosh")) return "macOS";
        if (lower.contains("iphone") || lower.contains("ipod")) return "iOS";
        if (lower.contains("ipad")) return "iPadOS";
        if (lower.contains("android")) return "Android";
        if (lower.contains("linux") && !lower.contains("android")) return "Linux";
        if (lower.contains("cros")) return "ChromeOS";
        if (lower.contains("freebsd")) return "FreeBSD";
        if (lower.contains("openbsd")) return "OpenBSD";
        return null;
    }

    public static String classifyIpType(String ip) {
        if (!StringUtils.hasText(ip)) {
            return "unknown";
        }
        String normalized = IpUtils.normalizeIp(ip).toLowerCase(Locale.ROOT);
        if (IpUtils.isLoopback(normalized)) {
            return "loopback";
        }
        if (isPrivateIp(normalized)) {
            return "private";
        }
        if (isLinkLocalIp(normalized)) {
            return "link-local";
        }
        return "public";
    }

    private static boolean isPrivateIp(String ip) {
        if (ip.startsWith("10.")) return true;
        if (ip.startsWith("172.")) {
            try {
                String[] parts = ip.split("\\.");
                if (parts.length >= 2) {
                    int second = Integer.parseInt(parts[1]);
                    if (second >= 16 && second <= 31) return true;
                }
            } catch (NumberFormatException ignored) {
            }
        }
        if (ip.startsWith("192.168.")) return true;
        if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
        if ("::1".equals(ip) || ip.startsWith("fe80:")) return false;
        return false;
    }

    private static boolean isLinkLocalIp(String ip) {
        return ip.startsWith("169.254.") || ip.startsWith("fe80:");
    }
}
