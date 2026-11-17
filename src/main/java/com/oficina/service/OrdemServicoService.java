package com.oficina.service;

import com.oficina.entity.*;
import com.oficina.repository.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class OrdemServicoService {
    public static final String CONFLITO = "Agendamento não permitido: o mecânico selecionado já possui uma ordem de serviço nesse horário. Selecione outro horário ou mecânico.";

    private final OrdemServicoRepository repository;
    private final LogAuditoriaRepository logRepository;

    public OrdemServicoService(OrdemServicoRepository repository, LogAuditoriaRepository logRepository) {
        this.repository = repository;
        this.logRepository = logRepository;
    }

    @Transactional
    public OrdemServico salvar(OrdemServico os, Usuario responsavel) {
        validarConflito(os, null);
        os.setUsuarioResponsavel(responsavel);
        OrdemServico salvo = repository.save(os);
        registrar("CADASTRO", salvo.getId(), responsavel);
        return salvo;
    }

    @Transactional
    public OrdemServico atualizar(Long id, OrdemServico dados, Usuario responsavel) {
        OrdemServico atual = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Ordem de serviço não encontrada."));
        validarConflito(dados, id);
        atual.setCliente(dados.getCliente());
        atual.setVeiculo(dados.getVeiculo());
        atual.setDescricao(dados.getDescricao());
        atual.setMecanico(dados.getMecanico());
        atual.setDataAgendamento(dados.getDataAgendamento());
        atual.setHorarioAgendamento(dados.getHorarioAgendamento());
        atual.setSituacao(dados.getSituacao());
        atual.setUsuarioResponsavel(responsavel);
        OrdemServico salvo = repository.save(atual);
        registrar("ALTERAÇÃO", salvo.getId(), responsavel);
        return salvo;
    }

    @Transactional
    public void excluir(Long id, Usuario responsavel) {
        if (!repository.existsById(id)) throw new IllegalArgumentException("Ordem de serviço não encontrada.");
        repository.deleteById(id);
        registrar("EXCLUSÃO", id, responsavel);
    }

    private void validarConflito(OrdemServico os, Long idIgnorado) {
        if (os.getMecanico() == null || os.getDataAgendamento() == null || os.getHorarioAgendamento() == null) {
            throw new IllegalArgumentException("Preencha mecânico, data e horário.");
        }
        boolean conflito = idIgnorado == null
            ? repository.existsByMecanicoIdAndDataAgendamentoAndHorarioAgendamento(os.getMecanico().getId(), os.getDataAgendamento(), os.getHorarioAgendamento())
            : repository.existsByMecanicoIdAndDataAgendamentoAndHorarioAgendamentoAndIdNot(os.getMecanico().getId(), os.getDataAgendamento(), os.getHorarioAgendamento(), idIgnorado);
        if (conflito) throw new IllegalArgumentException(CONFLITO);
    }

    private void registrar(String operacao, Long osId, Usuario usuario) {
        logRepository.save(new LogAuditoria(osId, operacao, LocalDateTime.now(), usuario.getNome()));
    }

    public Page<OrdemServico> listar(String nomeCliente, LocalDate data, int page, int size) {
        Specification<OrdemServico> spec = Specification.where((root, query, cb) -> cb.conjunction());
        if (nomeCliente != null && !nomeCliente.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("cliente").get("nome")), "%" + nomeCliente.toLowerCase() + "%"));
        }
        if (data != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("dataAgendamento"), data));
        }
        return repository.findAll(spec, PageRequest.of(Math.max(page, 0), size, Sort.by(Sort.Direction.DESC, "id")));
    }
}
