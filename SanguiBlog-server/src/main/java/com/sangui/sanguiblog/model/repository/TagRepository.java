package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TagRepository extends JpaRepository<Tag, Long> {
}
