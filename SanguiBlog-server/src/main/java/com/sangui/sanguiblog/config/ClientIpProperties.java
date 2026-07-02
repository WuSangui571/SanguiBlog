package com.sangui.sanguiblog.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "security.client-ip")
public class ClientIpProperties {

    /**
     * 受信代理地址列表（精确 IP 或 CIDR）。仅当请求的 immediate remote address 命中受信代理时，
     * 才会读取 CF-Connecting-IP / X-Real-IP / X-Forwarded-For 等可伪造头。
     * 默认为空：不信任任何转发头，直接使用 remoteAddr。
     */
    private List<String> trustedProxies = Collections.emptyList();
}
