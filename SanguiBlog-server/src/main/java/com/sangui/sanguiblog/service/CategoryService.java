package com.sangui.sanguiblog.service;

import com.sangui.sanguiblog.model.dto.CategoryTreeDto;
import com.sangui.sanguiblog.model.entity.Category;
import com.sangui.sanguiblog.model.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryTreeDto> tree() {
        List<Category> roots = categoryRepository.findByParentIsNullOrderBySortOrderAsc();
        return roots.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private CategoryTreeDto toDto(Category category) {
        List<CategoryTreeDto> children = categoryRepository.findByParentIdOrderBySortOrderAsc(category.getId())
                .stream()
                .map(this::toDto)
                .toList();

        return CategoryTreeDto.builder()
                .id(category.getId())
                .label(category.getName())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .children(children)
                .build();
    }
}
