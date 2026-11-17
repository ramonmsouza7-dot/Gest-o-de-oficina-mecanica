package com.oficina.config;

import com.oficina.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UsuarioDetailsService implements UserDetailsService {
    private final UsuarioRepository repository;

    public UsuarioDetailsService(UsuarioRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        var usuario = repository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado."));
        if (!usuario.isAtivo()) throw new UsernameNotFoundException("Usuário inativo.");
        return User.builder()
            .username(usuario.getEmail())
            .password(usuario.getSenha())
            .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getPerfil().name())))
            .build();
    }
}
