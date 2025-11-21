package com.sangui.sanguiblog.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI blogOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("SanguiBlog API")
                        .description("Blog backend API for front-end integration")
                        .version("1.0.0"));
    }
}
