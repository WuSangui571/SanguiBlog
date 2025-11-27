package com.sangui.sanguiblog.model.repository;

import com.sangui.sanguiblog.model.entity.RolePermission;
import com.sangui.sanguiblog.model.entity.RolePermissionId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermissionId> {

    List<RolePermission> findByRole_Id(Long roleId);

    List<RolePermission> findByRole_Code(String roleCode);

    void deleteByRole_Id(Long roleId);
}
