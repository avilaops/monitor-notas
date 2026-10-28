# Núcleo do Monitor de Notas

Dependência interna do monitor completo em desenvolvimento. Não contém painel,
sessão ou acesso ao banco do Lojas. As APIs preservadas estão em `src/index.ts`.

O arquivo `proveniencia.json` identifica revisão, caminho e SHA-256 dos arquivos
copiados. As adaptações neste repositório não alteram a origem.

Os adaptadores ERP/TMS recebem `fetcher` e ambiente explicitamente, permitem
testes sintéticos sem rede e mantêm credenciais no servidor. Não importar este
pacote inteiro no navegador: certificados e distribuição exigem Node.js.

O cofre do projeto usa `MONITOR_CERT_SECRET`, nunca o segredo do Lojas.
Distribuição e manifestação exigem chamada explícita; importar não inicia rede,
fila ou agendador. A operação fiscal não é ativada pela publicação do artefato.

## Limites e consistência

- XML/PDF: até 12 MiB; XML integral exige estrutura `nfeProc` com protocolo 100.
  Essa verificação não valida assinatura digital ou XSD.
- JSON remoto: até 4 MiB por página; streaming excessivo é cancelado.
- TMS: até 50 documentos por página, 10.000 páginas e prazo global de 60 segundos.
  Não retorna lista parcial: paginação alterada, IDs repetidos, falha de uma
  página ou total divergente exigem nova consulta.
- Credenciais não entram em URLs, redirects autenticados são recusados, e mapa
  de integração ausente ou inválido não dispara rede.
- `./browser` é a entrada para a interface; a entrada raiz inclui módulos Node.
