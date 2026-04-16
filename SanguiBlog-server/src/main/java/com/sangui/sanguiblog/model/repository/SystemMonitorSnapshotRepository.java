package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.SystemMonitorSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface SystemMonitorSnapshotRepository extends JpaRepository<SystemMonitorSnapshot, Long> {

    Optional<SystemMonitorSnapshot> findFirstBySampledAtGreaterThanEqualOrderBySampledAtAsc(Instant sampledAt);

    Optional<SystemMonitorSnapshot> findTopByOrderBySampledAtAsc();
}
