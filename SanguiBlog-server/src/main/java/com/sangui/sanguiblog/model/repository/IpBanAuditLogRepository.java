package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.IpBanAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IpBanAuditLogRepository extends JpaRepository<IpBanAuditLog, Long> {
}
