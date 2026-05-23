package com.sangui.sanguiblog.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class SiteWechatQrControllerAuthorizationTest {

    @Test
    void shouldRequireSuperAdminForUpload() throws NoSuchMethodException {
        assertPreAuthorize("upload", "hasRole('SUPER_ADMIN')");
    }

    @Test
    void shouldRequireSuperAdminForDelete() throws NoSuchMethodException {
        assertPreAuthorize("delete", "hasRole('SUPER_ADMIN')");
    }

    private void assertPreAuthorize(String methodName, String expectedValue) throws NoSuchMethodException {
        Method method = switch (methodName) {
            case "upload" -> SiteWechatQrController.class.getMethod(
                    methodName,
                    org.springframework.web.multipart.MultipartFile.class,
                    com.sangui.sanguiblog.security.UserPrincipal.class
            );
            case "delete" -> SiteWechatQrController.class.getMethod(
                    methodName,
                    com.sangui.sanguiblog.security.UserPrincipal.class
            );
            default -> throw new IllegalArgumentException("Unknown method: " + methodName);
        };
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        assertNotNull(annotation, () -> methodName + " should declare @PreAuthorize");
        assertEquals(expectedValue, annotation.value());
    }
}
