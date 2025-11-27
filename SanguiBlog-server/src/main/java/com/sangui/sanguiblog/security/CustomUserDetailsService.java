package com.sangui.sanguiblog.security;

import com.sangui.sanguiblog.model.entity.User;
import com.sangui.sanguiblog.model.repository.UserRepository;
import com.sangui.sanguiblog.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        var permissionCodes = permissionService.permissionsForRole(
                user.getRole() != null ? user.getRole().getCode() : "USER");
        return new UserPrincipal(user, permissionCodes);
    }
}
