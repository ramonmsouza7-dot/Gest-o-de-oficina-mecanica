package com.oficina.controller;

import com.oficina.entity.Perfil;
import com.oficina.repository.*;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PaginasController {
    private final ClienteRepository clienteRepository;
    private final VeiculoRepository veiculoRepository;
    private final UsuarioRepository usuarioRepository;

    public PaginasController(ClienteRepository clienteRepository, VeiculoRepository veiculoRepository, UsuarioRepository usuarioRepository) {
        this.clienteRepository = clienteRepository;
        this.veiculoRepository = veiculoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/")
    public String raiz() { return "redirect:/dashboard"; }

    @GetMapping("/login")
    public String login() { return "login"; }

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        model.addAttribute("totalClientes", clienteRepository.count());
        model.addAttribute("totalVeiculos", veiculoRepository.count());
        model.addAttribute("totalMecanicos", usuarioRepository.findByPerfil(Perfil.MECANICO).size());
        return "dashboard";
    }
}
