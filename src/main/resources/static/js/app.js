document.addEventListener('DOMContentLoaded', () => {
  const select = document.querySelector('#clienteVeiculoSelect');
  const form = document.querySelector('#veiculo-form');
  if (select && form) {
    select.addEventListener('change', () => {
      form.action = `/clientes/${select.value}/veiculos`;
    });
    if (select.value) form.action = `/clientes/${select.value}/veiculos`;
  }
});
