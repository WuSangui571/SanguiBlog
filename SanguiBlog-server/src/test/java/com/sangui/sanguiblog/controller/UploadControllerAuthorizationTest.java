package com.sangui.sanguiblog.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class UploadControllerAuthorizationTest {

    @Test
    void shouldRequirePostCreateOrEditPermissionForArticleUploads() throws NoSuchMethodException {
        assertPreAuthorize("uploadPostCover", "hasRole('SUPER_ADMIN') or hasAnyAuthority('PERM_POST_CREATE','PERM_POST_EDIT')");
        assertPreAuthorize("reservePostAssetsFolder", "hasRole('SUPER_ADMIN') or hasAnyAuthority('PERM_POST_CREATE','PERM_POST_EDIT')");
        assertPreAuthorize("uploadPostAssets", "hasRole('SUPER_ADMIN') or hasAnyAuthority('PERM_POST_CREATE','PERM_POST_EDIT')");
    }

    @Test
    void shouldKeepAvatarUploadWithoutPostPermissionRequirement() throws NoSuchMethodException {
        Method method = UploadController.class.getMethod("uploadAvatar", org.springframework.web.multipart.MultipartFile.class);
        assertNull(method.getAnnotation(PreAuthorize.class));
    }

    private void assertPreAuthorize(String methodName, String expectedValue) throws NoSuchMethodException {
        Method method = switch (methodName) {
            case "uploadPostCover" -> UploadController.class.getMethod(
                    methodName,
                    org.springframework.web.multipart.MultipartFile.class,
                    String.class
            );
            case "reservePostAssetsFolder" -> UploadController.class.getMethod(methodName, String.class);
            case "uploadPostAssets" -> UploadController.class.getMethod(
                    methodName,
                    String.class,
                    java.util.List.class
            );
            default -> throw new IllegalArgumentException("Unknown method: " + methodName);
        };
        PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
        assertNotNull(annotation, () -> methodName + " should declare @PreAuthorize");
        assertEquals(expectedValue, annotation.value());
    }
}
