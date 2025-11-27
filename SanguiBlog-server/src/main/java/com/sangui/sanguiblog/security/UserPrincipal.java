package com.sangui.sanguiblog.security;

import com.sangui.sanguiblog.model.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

@Getter
public class UserPrincipal implements UserDetails {
    private final Long id;
    private final String username;
    private final String password;
    private final String roleCode;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user, Collection<String> permissionCodes) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.password = Objects.toString(user.getPasswordHash(), "");
        this.roleCode = user.getRole() != null ? user.getRole().getCode() : "USER";
        List<GrantedAuthority> grants = new ArrayList<>();
        grants.add(new SimpleGrantedAuthority("ROLE_" + roleCode));
        if (permissionCodes != null) {
            permissionCodes.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(code -> !code.isBlank())
                    .forEach(code -> grants.add(new SimpleGrantedAuthority("PERM_" + code)));
        }
        this.authorities = grants;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
