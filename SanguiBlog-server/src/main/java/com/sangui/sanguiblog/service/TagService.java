package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.PageResponse;
import com.sangui.sanguiblog.model.dto.TagDto;
import com.sangui.sanguiblog.model.dto.TagRequest;
import com.sangui.sanguiblog.model.entity.Tag;
import com.sangui.sanguiblog.model.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    public List<TagDto> list() {
        return tagRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public PageResponse<TagDto> search(String keyword, int page, int size) {
        int safePage = Math.max(page, 1) - 1;
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "updatedAt"));
        Page<Tag> pageData;
        if (StringUtils.hasText(keyword)) {
            pageData = tagRepository.findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase(keyword, keyword, pageable);
        } else {
            pageData = tagRepository.findAll(pageable);
        }
        return new PageResponse<>(
                pageData.getContent().stream().map(this::toDto).toList(),
                pageData.getTotalElements(),
                pageData.getNumber() + 1,
                pageData.getSize()
        );
    }

    @Transactional
    public TagDto create(TagRequest request) {
        String name = request.getName().trim();
        String slug = resolveSlug(request.getSlug(), name);
        tagRepository.findByNameIgnoreCase(name).ifPresent(tag -> {
            throw new IllegalArgumentException("标签名称已存在");
        });
        tagRepository.findBySlugIgnoreCase(slug).ifPresent(tag -> {
            throw new IllegalArgumentException("标签别名已存在");
        });
        Tag tag = new Tag();
        tag.setName(name);
        tag.setSlug(slug);
        tag.setDescription(StringUtils.hasText(request.getDescription()) ? request.getDescription().trim() : null);
        Instant now = Instant.now();
        tag.setCreatedAt(now);
        tag.setUpdatedAt(now);
        return toDto(tagRepository.save(tag));
    }

    @Transactional
    public TagDto update(Long id, TagRequest request) {
        Tag tag = tagRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("标签不存在"));
        String name = request.getName().trim();
        String slug = resolveSlug(request.getSlug(), name);
        tagRepository.findByNameIgnoreCase(name)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("标签名称已存在");
                });
        tagRepository.findBySlugIgnoreCase(slug)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("标签别名已存在");
                });
        tag.setName(name);
        tag.setSlug(slug);
        tag.setDescription(StringUtils.hasText(request.getDescription()) ? request.getDescription().trim() : null);
        tag.setUpdatedAt(Instant.now());
        return toDto(tagRepository.save(tag));
    }

    @Transactional
    public void delete(Long id) {
        Tag tag = tagRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("标签不存在"));
        tagRepository.delete(tag);
    }

    private TagDto toDto(Tag tag) {
        return TagDto.builder()
                .id(tag.getId())
                .name(tag.getName())
                .slug(tag.getSlug())
                .description(tag.getDescription())
                .createdAt(tag.getCreatedAt())
                .updatedAt(tag.getUpdatedAt())
                .build();
    }

    private String resolveSlug(String providedSlug, String name) {
        String candidate = StringUtils.hasText(providedSlug) ? providedSlug : name;
        String normalized = Normalizer.normalize(candidate, Normalizer.Form.NFD)
                .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "");
        normalized = normalized.replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-")
                .toLowerCase(Locale.ROOT);
        if (!StringUtils.hasText(normalized)) {
            normalized = "tag-" + UUID.randomUUID();
        }
        return normalized;
    }
}
