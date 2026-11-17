package com.oficina.config;

import com.oficina.entity.Perfil;
import com.oficina.entity.Usuario;
import com.oficina.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner inicializarUsuarios(UsuarioRepository usuarioRepository, PasswordEncoder encoder) {
        return args -> {
            if (usuarioRepository.findByEmail("admin@oficina.com").isEmpty()) {
                usuarioRepository.save(new Usuario(null, "Administrador", "admin@oficina.com", encoder.encode("123456"), Perfil.ADMINISTRADOR, true));
            }
            if (usuarioRepository.findByEmail("mecanico@oficina.com").isEmpty()) {
                usuarioRepository.save(new Usuario(null, "Carlos Mecânico", "mecanico@oficina.com", encoder.encode("123456"), Perfil.MECANICO, true));
            }
            if (usuarioRepository.findByEmail("joao@oficina.com").isEmpty()) {
                usuarioRepository.save(new Usuario(null, "João Mecânico", "joao@oficina.com", encoder.encode("123456"), Perfil.MECANICO, true));
            }
        };
    }
}
