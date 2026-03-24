package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.RegistrationInvite;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RegistrationInviteRepository extends JpaRepository<RegistrationInvite, Long> {

    boolean existsByInviteCode(String inviteCode);

    Optional<RegistrationInvite> findByInviteCodeIgnoreCase(String inviteCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RegistrationInvite r where upper(r.inviteCode) = upper(:inviteCode)")
    Optional<RegistrationInvite> findByInviteCodeForUpdate(@Param("inviteCode") String inviteCode);
}
