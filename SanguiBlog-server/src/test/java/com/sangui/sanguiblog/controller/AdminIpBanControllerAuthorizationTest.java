package com.sangui.sanguiblog.controller;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.AnnotatedElement;
import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class AdminIpBanControllerAuthorizationTest {

    private static final String SUPER_ADMIN = "hasRole('SUPER_ADMIN')";

    @Test
    void classLevelShouldRequireSuperAdmin() {
        PreAuthorize annotation = AdminIpBanController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(annotation, "AdminIpBanController should declare class-level @PreAuthorize");
        assertEquals(SUPER_ADMIN, annotation.value());
    }

    @Test
    void allMethodsInheritSuperAdminFromClass() throws Exception {
        for (Method method : AdminIpBanController.class.getDeclaredMethods()) {
            AnnotatedElement element = method;
            PreAuthorize methodAnnotation = element.getAnnotation(PreAuthorize.class);
            // 方法级注解若存在，必须至少与类级一样严格（仍为 SUPER_ADMIN）；不存在则继承类级。
            if (methodAnnotation != null) {
                assertEquals(SUPER_ADMIN, methodAnnotation.value(),
                        () -> method.getName() + " must keep SUPER_ADMIN authorization");
            }
        }
    }
}
