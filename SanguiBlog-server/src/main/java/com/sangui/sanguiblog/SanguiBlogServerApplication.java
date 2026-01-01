package com.sangui.sanguiblog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SanguiBlogServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(SanguiBlogServerApplication.class, args);
    }

}
