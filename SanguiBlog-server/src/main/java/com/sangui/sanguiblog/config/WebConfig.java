package com.sangui.sanguiblog.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final StoragePathResolver storagePathResolver;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(storagePathResolver.toResourceLocation(storagePathResolver.getRootPath()));

        registry.addResourceHandler("/avatar/**")
                .addResourceLocations(storagePathResolver.toResourceLocation(storagePathResolver.getAvatarDir()));
    }
}
