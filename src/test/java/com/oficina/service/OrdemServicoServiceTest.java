package com.oficina.service;

import com.oficina.entity.*;
import com.oficina.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@Import(OrdemServicoService.class)
class OrdemServicoServiceTest {

    @Autowired OrdemServicoRepository ordens;
    @Autowired ClienteRepository clientes;
    @Autowired VeiculoRepository veiculos;
    @Autowired UsuarioRepository usuarios;
    @Autowired LogAuditoriaRepository logs;
    @Autowired OrdemServicoService service;

    private Cliente cliente;
    private Veiculo veiculo;
    private Usuario mecanico;
    private Usuario responsavel;

    @BeforeEach
    void prepararDados() {
        cliente = new Cliente();
        cliente.setNome("Maria Silva");
        cliente.setCpf("11111111111");
        clientes.save(cliente);

        veiculo = new Veiculo();
        veiculo.setCliente(cliente);
        veiculo.setMarca("Honda");
        veiculo.setModelo("Civic");
        veiculo.setPlaca("ABC1D23");
        veiculos.save(veiculo);

        mecanico = new Usuario(null, "Carlos", "carlos@oficina.com", "hash", Perfil.MECANICO, true);
        usuarios.save(mecanico);
        responsavel = new Usuario(null, "Administrador", "admin@oficina.com", "hash", Perfil.ADMINISTRADOR, true);
        usuarios.save(responsavel);
    }

    @Test
    void cenario1_cadastroPermitidoQuandoMecanicoEstaLivre() {
        OrdemServico os = criarOs(LocalDate.of(2026, 12, 1), LocalTime.of(9, 0));
        OrdemServico salvo = service.salvar(os, responsavel);
        assertNotNull(salvo.getId());
        assertEquals(1, ordens.count());
    }

    @Test
    void cenario2_bloqueiaSegundaOSNoMesmoHorario() {
        OrdemServico primeira = criarOs(LocalDate.of(2026, 12, 2), LocalTime.of(10, 0));
        service.salvar(primeira, responsavel);

        OrdemServico segunda = criarOs(LocalDate.of(2026, 12, 2), LocalTime.of(10, 0));
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
            () -> service.salvar(segunda, responsavel));

        assertEquals(OrdemServicoService.CONFLITO, erro.getMessage());
    }

    @Test
    void cenario3_bloqueiaAlteracaoParaHorarioOcupado() {
        OrdemServico existente = criarOs(LocalDate.of(2026, 12, 3), LocalTime.of(11, 0));
        OrdemServico outra = criarOs(LocalDate.of(2026, 12, 3), LocalTime.of(14, 0));
        service.salvar(existente, responsavel);
        service.salvar(outra, responsavel);

        outra.setHorarioAgendamento(LocalTime.of(11, 0));
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
            () -> service.atualizar(outra.getId(), outra, responsavel));

        assertEquals(OrdemServicoService.CONFLITO, erro.getMessage());
    }

    private OrdemServico criarOs(LocalDate data, LocalTime horario) {
        OrdemServico os = new OrdemServico();
        os.setCliente(cliente);
        os.setVeiculo(veiculo);
        os.setDescricao("Troca de óleo e revisão");
        os.setMecanico(mecanico);
        os.setDataAgendamento(data);
        os.setHorarioAgendamento(horario);
        os.setSituacao(SituacaoOS.AGENDADA);
        return os;
    }
}
