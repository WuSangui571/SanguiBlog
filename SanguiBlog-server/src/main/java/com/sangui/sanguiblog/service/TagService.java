package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.TagDto;
import com.sangui.sanguiblog.model.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    public List<TagDto> list() {
        return tagRepository.findAll().stream()
                .map(t -> TagDto.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .slug(t.getSlug())
                        .build())
                .toList();
    }
}
