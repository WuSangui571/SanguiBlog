package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.exception.AiAccessControlException;
import com.sangui.sanguiblog.security.botguard.BotGuardCaptchaService;
import com.sangui.sanguiblog.security.botguard.BotGuardProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiGuestAccessServiceTest {

    @Test
    void shouldIssueVisitorCookieAndAllowFirstGuestRequest() {
        AiGuestAccessService service = new AiGuestAccessService(buildProps(), mockCaptchaService(false), new BotGuardProperties());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        request.addHeader("User-Agent", "JUnit");
        MockHttpServletResponse response = new MockHttpServletResponse();

        AiGuestAccessService.AccessContext context = service.resolveContext(null, request, response);
        service.assertCanSend(context);

        assertTrue(context.guest());
        assertNotNull(context.visitorId());
        assertNotNull(response.getHeader("Set-Cookie"));
    }

    @Test
    void shouldRequireCaptchaAfterRepeatedRapidGuestRequests() {
        AiGuestAccessProperties props = buildProps();
        props.setGuestMinIntervalMs(60_000);
        props.setGuestCaptchaStrikeThreshold(2);
        AiGuestAccessService service = new AiGuestAccessService(props, mockCaptchaService(false), new BotGuardProperties());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.2");
        request.addHeader("User-Agent", "JUnit");
        MockHttpServletResponse response = new MockHttpServletResponse();

        AiGuestAccessService.AccessContext context = service.resolveContext(null, request, response);
        service.assertCanSend(context);

        try {
            service.assertCanSend(context);
            fail("Second rapid request should be throttled");
        } catch (AiAccessControlException ex) {
            assertEquals(429, ex.getStatus().value());
        }

        try {
            service.assertCanSend(context);
            fail("Third rapid request should require captcha");
        } catch (AiAccessControlException ex) {
            assertEquals(403, ex.getStatus().value());
            assertEquals(Boolean.TRUE, ex.getData().get("captchaRequired"));
        }
    }

    @Test
    void shouldStopGuestsWhenDailyBudgetIsExhausted() {
        AiGuestAccessProperties props = buildProps();
        props.setGuestGlobalDailyBudget(1);
        AiGuestAccessService service = new AiGuestAccessService(props, mockCaptchaService(true), new BotGuardProperties());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.3");
        request.addHeader("User-Agent", "JUnit");
        MockHttpServletResponse response = new MockHttpServletResponse();

        AiGuestAccessService.AccessContext context = service.resolveContext(null, request, response);
        service.assertCanSend(context);

        try {
            service.assertCanSend(context);
            fail("Second request should exceed daily guest budget");
        } catch (AiAccessControlException ex) {
            assertEquals(429, ex.getStatus().value());
            assertEquals(Boolean.TRUE, ex.getData().get("dailyBudgetExceeded"));
        }
    }

    @Test
    void shouldAllowLoggedInUserWithHigherQuotaWithoutGuestCookie() {
        AiGuestAccessService service = new AiGuestAccessService(buildProps(), mockCaptchaService(false), new BotGuardProperties());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.4");
        MockHttpServletResponse response = new MockHttpServletResponse();

        AiGuestAccessService.AccessContext context = service.resolveContext(1L, request, response);

        assertEquals(false, context.guest());
        service.assertCanSend(context);
    }

    private AiGuestAccessProperties buildProps() {
        AiGuestAccessProperties props = new AiGuestAccessProperties();
        props.setEnabled(true);
        props.setGuestMinIntervalMs(1);
        props.setGuestPerVisitorHour(10);
        props.setGuestPerVisitorDay(20);
        props.setGuestPerIpHour(20);
        props.setGuestPerIpDay(50);
        props.setGuestCaptchaStrikeThreshold(2);
        props.setGuestBlockStrikeThreshold(4);
        props.setGuestGlobalDailyBudget(100);
        props.setUserMinIntervalMs(1);
        props.setUserPerHour(100);
        props.setUserPerDay(200);
        return props;
    }

    private BotGuardCaptchaService mockCaptchaService(boolean verified) {
        BotGuardCaptchaService service = mock(BotGuardCaptchaService.class);
        when(service.isVerified(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(verified);
        return service;
    }
}
