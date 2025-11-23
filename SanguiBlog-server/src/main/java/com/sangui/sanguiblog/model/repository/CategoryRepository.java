package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long>, JpaSpecificationExecutor<Category> {
    List<Category> findByParentIsNullOrderBySortOrderAsc();

    List<Category> findByParentIdOrderBySortOrderAsc(Long parentId);

    Optional<Category> findByNameIgnoreCase(String name);

    Optional<Category> findBySlugIgnoreCase(String slug);
}
