# Arquitetura do monitor independente

## Escopo

Escolha explícita do usuário em 28/10/2026: monitor completo com painel e API
próprios. A origem Lojas permanece integralmente preservada. Não substituir seu
código por imports deste projeto nem migrar dados ou consumidores.

## Fronteiras

- `packages/core`: classificação, interpretação, validação de arquivos, contratos,
  leitura da distribuição, certificados e adaptadores ERP/TMS. Sem Prisma,
  sessão ou Next.js. Funções não iniciam coleta ao importar o pacote.
- API e persistência independentes: identidade autenticada resolve a empresa;
  documentos, eventos, XML original, certificados cifrados, cursor e fila têm
  escopo explícito. Reserva e gravação transacional preservam cursor/deduplicação.
- Painel independente: versão copiada da interface do Lojas, adaptada à própria
  sessão e API. Deve cobrir pesquisa, paginação, resumo/integral/evento, downloads,
  configuração, manifestação explícita e fluxos de revisão.

## Operação

ERP integrado é fonte canônica de NF-e e TMS de seus CT-e. Clonar código não
autoriza outro coletor do mesmo CNPJ. Ativação fiscal exige configuração e pedido
operacional próprios. Nenhum certificado, XML real ou segredo é copiado.

XML original é preservado; projeção não prova autorização/assinatura/XSD. Downloads
permanecem privados e limitados. Manifestação continua sendo ação explícita.

## Validação

CI testa fixtures sintéticas, isolamento, cursor, paginação remota e falhas.
Publica artefatos vinculados ao commit; desenvolvimento, CI e operação real são
estados distintos. Não há deploy automático nesta fase.
