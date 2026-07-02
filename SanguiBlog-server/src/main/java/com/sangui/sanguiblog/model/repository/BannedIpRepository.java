package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.BannedIp;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BannedIpRepository extends JpaRepository<BannedIp, Long> {

    Optional<BannedIp> findByIp(String ip);

    Optional<BannedIp> findByIpAndEnabledTrue(String ip);

    List<BannedIp> findByEnabledTrueAndIpIn(Collection<String> ips);

    @Query("""
            select b from BannedIp b
            where (:ip is null or b.ip like %:ip%)
              and (:enabledOnly = false or b.enabled = true)
            order by b.createdAt desc
            """)
    Page<BannedIp> search(@Param("ip") String ip,
                          @Param("enabledOnly") boolean enabledOnly,
                          Pageable pageable);

    @Modifying
    @Transactional
    @Query("update BannedIp b set b.hitCount = b.hitCount + 1, b.lastHitTime = :now where b.ip = :ip and b.enabled = true")
    int incrementHit(@Param("ip") String ip, @Param("now") LocalDateTime now);
}
