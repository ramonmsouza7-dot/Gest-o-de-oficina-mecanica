package com.oficina.controller;

import com.oficina.entity.*;
import com.oficina.repository.*;
import com.oficina.service.OrdemServicoService;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDate;

@Controller
@RequestMapping("/ordens")
public class OrdemServicoController {
    private final OrdemServicoService service;
    private final OrdemServicoRepository ordens;
    private final ClienteRepository clientes;
    private final VeiculoRepository veiculos;
    private final UsuarioRepository usuarios;

    public OrdemServicoController(OrdemServicoService service, OrdemServicoRepository ordens, ClienteRepository clientes, VeiculoRepository veiculos, UsuarioRepository usuarios) {
        this.service = service;
        this.ordens = ordens;
        this.clientes = clientes;
        this.veiculos = veiculos;
        this.usuarios = usuarios;
    }

    @GetMapping
    public String listar(@RequestParam(required = false) String cliente,
                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
                         @RequestParam(defaultValue = "0") int page,
                         Model model) {
        Page<OrdemServico> resultado = service.listar(cliente, data, page, 10);
        model.addAttribute("resultado", resultado);
        model.addAttribute("clienteFiltro", cliente);
        model.addAttribute("dataFiltro", data);
        model.addAttribute("os", new OrdemServico());
        model.addAttribute("clientes", clientes.findAll());
        model.addAttribute("veiculos", veiculos.findAll());
        model.addAttribute("mecanicos", usuarios.findByPerfil(Perfil.MECANICO));
        model.addAttribute("situacoes", SituacaoOS.values());
        return "ordens";
    }

    @PostMapping
    public String cadastrar(@ModelAttribute OrdemServico os,
                            @AuthenticationPrincipal UserDetails user,
                            RedirectAttributes redirect) {
        try {
            Usuario responsavel = usuarios.findByEmail(user.getUsername()).orElseThrow();
            service.salvar(os, responsavel);
            redirect.addFlashAttribute("sucesso", "Ordem de serviço cadastrada com sucesso.");
        } catch (IllegalArgumentException ex) {
            redirect.addFlashAttribute("erro", ex.getMessage());
        }
        return "redirect:/ordens";
    }

    @PostMapping("/{id}/atualizar")
    public String atualizar(@PathVariable Long id,
                            @ModelAttribute OrdemServico os,
                            @AuthenticationPrincipal UserDetails user,
                            RedirectAttributes redirect) {
        try {
            Usuario responsavel = usuarios.findByEmail(user.getUsername()).orElseThrow();
            service.atualizar(id, os, responsavel);
            redirect.addFlashAttribute("sucesso", "Ordem de serviço atualizada com sucesso.");
        } catch (IllegalArgumentException ex) {
            redirect.addFlashAttribute("erro", ex.getMessage());
        }
        return "redirect:/ordens";
    }

    @PostMapping("/{id}/excluir")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public String excluir(@PathVariable Long id,
                          @AuthenticationPrincipal UserDetails user,
                          RedirectAttributes redirect) {
        Usuario responsavel = usuarios.findByEmail(user.getUsername()).orElseThrow();
        service.excluir(id, responsavel);
        redirect.addFlashAttribute("sucesso", "Ordem de serviço excluída.");
        return "redirect:/ordens";
    }
}
