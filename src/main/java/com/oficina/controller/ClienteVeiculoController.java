package com.oficina.controller;

import com.oficina.entity.Cliente;
import com.oficina.entity.Veiculo;
import com.oficina.repository.ClienteRepository;
import com.oficina.repository.VeiculoRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/clientes")
public class ClienteVeiculoController {
    private final ClienteRepository clientes;
    private final VeiculoRepository veiculos;

    public ClienteVeiculoController(ClienteRepository clientes, VeiculoRepository veiculos) {
        this.clientes = clientes;
        this.veiculos = veiculos;
    }

    @GetMapping
    public String listar(Model model) {
        model.addAttribute("clientes", clientes.findAll());
        model.addAttribute("novoCliente", new Cliente());
        model.addAttribute("novoVeiculo", new Veiculo());
        return "clientes";
    }

    @PostMapping
    public String cadastrar(@ModelAttribute Cliente novoCliente) {
        clientes.save(novoCliente);
        return "redirect:/clientes";
    }

    @PostMapping("/{clienteId}/veiculos")
    public String cadastrarVeiculo(@PathVariable Long clienteId, @ModelAttribute Veiculo novoVeiculo) {
        Cliente cliente = clientes.findById(clienteId).orElseThrow();
        novoVeiculo.setCliente(cliente);
        veiculos.save(novoVeiculo);
        return "redirect:/clientes";
    }

    @PostMapping("/{id}/excluir")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public String excluir(@PathVariable Long id) {
        clientes.deleteById(id);
        return "redirect:/clientes";
    }
}
