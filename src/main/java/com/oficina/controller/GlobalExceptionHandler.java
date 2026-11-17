package com.oficina.controller;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(AccessDeniedException.class)
    public String acessoNegado(RedirectAttributes redirect) {
        redirect.addFlashAttribute("erro", "Você não possui permissão para realizar esta operação.");
        return "redirect:/dashboard";
    }
}
