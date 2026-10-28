# Monitor de Notas

Monitor completo com painel e API próprios, desenvolvido por cópia do módulo
fiscal do Lojas. A implementação original permanece no Lojas.

Demanda: [AVL-326](https://linear.app/avilaops/issue/AVL-326).

## Desenvolvimento

O produto está em implementação por módulos. O pacote de núcleo não representa
sozinho a entrega do painel/API. Consulte [plano](docs/PLANO.md) e
[arquitetura](docs/ARQUITETURA.md) para o escopo e o estado verificável.

```sh
git clone git@github.com:avilaops/monitor-notas.git
```

Instalação, testes, typecheck, compilação e empacotamento são executados no GitHub
Actions. Os artefatos da CI identificam o commit. Nenhuma configuração fiscal ou
credencial do Lojas acompanha este repositório.
