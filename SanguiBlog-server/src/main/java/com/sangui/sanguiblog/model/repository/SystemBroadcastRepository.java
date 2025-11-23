package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.SystemBroadcast;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

public interface SystemBroadcastRepository extends JpaRepository<SystemBroadcast, Long> {

    @Query("select b from SystemBroadcast b where b.isActive = true and (b.activeFrom is null or b.activeFrom <= :now) and (b.activeTo is null or b.activeTo >= :now) order by b.activeFrom desc")
    Optional<SystemBroadcast> findActive(LocalDateTime now);

    Optional<SystemBroadcast> findTopByOrderByCreatedAtDesc();
}
