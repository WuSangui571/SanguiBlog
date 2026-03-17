package com.sangui.sanguiblog.service.ai;

import com.sangui.sanguiblog.model.entity.SiteSetting;
import com.sangui.sanguiblog.model.repository.SiteSettingRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiAssistantSettingServiceTest {

    @Test
    void shouldFallbackToDefaultsWhenSettingsMissing() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.title")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.welcome_message")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.input_placeholder")).thenReturn(Optional.empty());
        when(repository.findBySettingKey("ai.chat.system_prompt")).thenReturn(Optional.empty());

        AiAssistantSettingService service = new AiAssistantSettingService(repository);

        assertEquals("三桂博客AI助理", service.siteConfig().getTitle());
        assertEquals("你好，我是三桂博客AI助理", service.siteConfig().getWelcomeMessage());
        assertEquals("请输入你的问题...", service.siteConfig().getInputPlaceholder());
        assertEquals(AiAssistantSettingService.DEFAULT_SYSTEM_PROMPT, service.systemPrompt());
    }

    @Test
    void shouldUseSiteSettingsWhenConfigured() {
        SiteSettingRepository repository = mock(SiteSettingRepository.class);
        when(repository.findBySettingKey("ai.chat.title")).thenReturn(Optional.of(setting("ai.chat.title", "站内问答助理")));
        when(repository.findBySettingKey("ai.chat.welcome_message")).thenReturn(Optional.of(setting("ai.chat.welcome_message", "欢迎来到三桂博客。")));
        when(repository.findBySettingKey("ai.chat.input_placeholder")).thenReturn(Optional.of(setting("ai.chat.input_placeholder", "请输入博客相关问题")));
        when(repository.findBySettingKey("ai.chat.system_prompt")).thenReturn(Optional.of(setting("ai.chat.system_prompt", "你只回答本站相关问题。")));

        AiAssistantSettingService service = new AiAssistantSettingService(repository);

        assertEquals("站内问答助理", service.siteConfig().getTitle());
        assertEquals("欢迎来到三桂博客。", service.siteConfig().getWelcomeMessage());
        assertEquals("请输入博客相关问题", service.siteConfig().getInputPlaceholder());
        String prompt = service.systemPrompt();
        assertTrue(prompt.contains(AiAssistantSettingService.DEFAULT_SYSTEM_PROMPT));
        assertTrue(prompt.contains("你只回答本站相关问题。"));
    }

    private static SiteSetting setting(String key, String value) {
        SiteSetting siteSetting = new SiteSetting();
        siteSetting.setSettingKey(key);
        siteSetting.setSettingValue(value);
        return siteSetting;
    }
}
