package com.sangui.sanguiblog.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class AdminAnalyticsControllerAuthorizationTest {

    private static final String SUPER_ADMIN_ANALYTICS_VIEW =
            "hasAuthority('PERM_ANALYTICS_VIEW') and hasRole('SUPER_ADMIN')";

    @Test
    void shouldRequireSuperAdminForPageViewDetailLikeDelete() throws NoSuchMethodException {
        assertPreAuthorize("pageViewDetail", SUPER_ADMIN_ANALYTICS_VIEW);
        assertPreAuthorize("deletePageView", SUPER_ADMIN_ANALYTICS_VIEW);
    }

    private void assertPreAuthorize(String methodName, String expectedValue) throws NoSuchMethodException {
        Method method = AdminAnalyticsController.class.getMethod(methodName, Long.class);
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        assertNotNull(annotation, () -> methodName + " should declare @PreAuthorize");
        assertEquals(expectedValue, annotation.value());
    }
}
