package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.service.ClientIpResolver;
import com.sangui.sanguiblog.service.IpBanService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Nginx auth_request 内部访问检查端点。
 * <p>
 * - 204 No Content：IP 未被封禁，放行。
 * - 403 Forbidden：IP 已被封禁。
 * <p>
 * 不使用 ApiResponse，不暴露封禁原因/规则/后台路径等实现细节给被封禁访客。
 * 该端点由 SecurityConfig 放行且 BotGuardFilter 跳过，Nginx 以 internal location 调用。
 */
@RestController
@RequestMapping("/internal/security")
@RequiredArgsConstructor
public class InternalSecurityController {

    private final IpBanService ipBanService;
    private final ClientIpResolver clientIpResolver;

    @GetMapping("/ip-access-check")
    public ResponseEntity<Void> ipAccessCheck(HttpServletRequest request) {
        String ip = clientIpResolver.resolve(request);
        if (ipBanService.isAccessAllowed(ip)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.status(403).build();
    }
}
