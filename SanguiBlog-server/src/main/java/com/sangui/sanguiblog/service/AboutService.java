package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.AboutDto;
import com.sangui.sanguiblog.model.entity.AboutPage;
import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.AboutPageRepository;
import com.sangui.sanguiblog.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AboutService {

    private final AboutPageRepository aboutPageRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Optional<AboutDto> getAbout() {
        return aboutPageRepository.findTopByOrderByUpdatedAtDesc()
                .map(this::toDto);
    }

    @Transactional
    public AboutDto saveOrUpdate(String contentMd, Long userId) {
        AboutPage about = aboutPageRepository.findTopByOrderByIdAsc()
                .orElseGet(AboutPage::new);

        about.setContentMd(contentMd);
        about.setContentHtml(renderMarkdown(contentMd));

        Instant now = Instant.now();
        if (about.getCreatedAt() == null) {
            about.setCreatedAt(now);
        }
        about.setUpdatedAt(now);

        if (userId != null) {
            User updater = userRepository.findById(userId)
                    .orElse(null);
            about.setUpdatedBy(updater);
        }

        AboutPage saved = aboutPageRepository.save(about);
        return toDto(saved);
    }

    private String renderMarkdown(String markdown) {
        if (markdown == null) return null;
        List<org.commonmark.Extension> extensions = Arrays.asList(
                org.commonmark.ext.gfm.tables.TablesExtension.create(),
                org.commonmark.ext.gfm.strikethrough.StrikethroughExtension.create(),
                org.commonmark.ext.autolink.AutolinkExtension.create());
        org.commonmark.parser.Parser parser = org.commonmark.parser.Parser.builder()
                .extensions(extensions)
                .build();
        org.commonmark.renderer.html.HtmlRenderer renderer = org.commonmark.renderer.html.HtmlRenderer.builder()
                .extensions(extensions)
                .build();
        return renderer.render(parser.parse(markdown));
    }

    private AboutDto toDto(AboutPage about) {
        AboutDto dto = new AboutDto();
        dto.setContentMd(about.getContentMd());
        dto.setContentHtml(about.getContentHtml());
        dto.setUpdatedAt(about.getUpdatedAt());
        if (about.getUpdatedBy() != null) {
            dto.setUpdatedBy(about.getUpdatedBy().getDisplayName());
        }
        return dto;
    }
}
