package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByParentIsNullOrderBySortOrderAsc();
    List<Category> findByParentIdOrderBySortOrderAsc(Long parentId);
}
