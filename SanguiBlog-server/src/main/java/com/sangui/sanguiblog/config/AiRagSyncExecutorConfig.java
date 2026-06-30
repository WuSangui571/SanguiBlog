package com.sangui.sanguiblog.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

@Configuration
public class AiRagSyncExecutorConfig {

    @Bean("aiRagSyncExecutor")
    public Executor aiRagSyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("rag-sync-");
        executor.setRejectedExecutionHandler((task, rejectedExecutor) -> {
            throw new RejectedExecutionException("RAG sync executor queue full");
        });
        executor.setWaitForTasksToCompleteOnShutdown(false);
        executor.initialize();
        return executor;
    }
}
