# Monitor completo — plano de implementação

## Contrato

Painel e API independentes, por clonagem do Lojas. Nenhuma remoção ou alteração
na origem. Builds e testes exclusivamente no GitHub CI. Escopo AVL-326.

## Módulo 1 — Núcleo fiscal e adaptadores

- [x] Copiar interpretação, classificação, conteúdo, distribuição e certificados
  do commit de origem, com manifesto de proveniência e hashes.
- [x] Preservar os testes de origem e acrescentar contratos independentes.
- [x] Adaptar a paginação CT-e completa, recusando respostas inconsistentes.
- [x] Evitar perda de eventos na deduplicação e valores ausentes como zero.
- [x] CI: testes sintéticos, typecheck, compilação e artefato consumível.

Arquivos: `packages/core/src/*.ts`, `packages/core/tests/*.test.ts`,
`proveniencia.json`. Contrato: funções públicas exportadas por `src/index.ts`;
interface de rede injetável, sem dependência da sessão ou Prisma do Lojas.

## Módulo 2 — Persistência e API independentes

- [ ] Banco próprio; empresas, autorização, documentos, eventos, certificados,
  cursor, manifestações, auditoria, fluxos e fila.
- [ ] Autenticação para navegador e serviço; escopo sempre pela identidade.
- [ ] Listagem paginada, pesquisa, totais históricos, XML/DANFE e ERP/TMS.
- [ ] Coleta desativada por padrão; reserva e transação para cursor/documentos.
- [ ] Configuração A1, manifestação explícita e encaminhamento para revisão.
- [ ] Testes PostgreSQL de isolamento, concorrência, rollback e idempotência.

## Módulo 3 — Painel completo e entrega

- [ ] Copiar/adaptar interface Fiscal, downloads e fluxos do Lojas.
- [ ] Login, configuração, notas, CT-e, eventos, filtros, paginação e erros.
- [ ] Desktop/mobile, autenticação e downloads verificados na CI.
- [ ] README de instalação/configuração; imagem/artefato pronto pela CI.
- [ ] Revisão final contra todos os critérios da AVL-326.

## Registro

- 28/10/2026: destino confirmado pelo usuário; repositório independente criado.
  Visibilidade pública confirmada após correção do usuário; Lojas também público.
- Decisão: manter TypeScript e contratos atuais do Lojas; núcleo não substitui o
  monitor completo e é uma dependência interna dos próximos módulos.
- Decisão: não portar o comércio do Lojas para viabilizar o monitor; adaptar as
  fronteiras de sessão, banco e transporte no repositório independente.
- Testes novos serão enviados à CI antes das correções; nenhum teste/build local.
- CI 40642137626 bloqueada antes de qualquer step por pagamento/limite de gastos.
  O run não demonstra teste vermelho nem falha no código. Implementação do módulo
  1 e revisão estática avançadas; módulo não concluído sem testes/typecheck/build.
- Revisão independente: corrigidos reconhecimento de XML apenas por regex e
  leitura sem limite das listagens remotas. Testes sintéticos adicionados.
- 28/10/2026: corrigida a visibilidade do repositório para pública. CI
  [40642544707](https://github.com/avilaops/monitor-notas/actions/runs/40642544707)
  reexecutada e aprovada: 44 testes, typecheck, compilação, importação ESM e pacote.
  Artefato `monitor-notas-core-f883f058924f72e2e0d3e8144bce4d76a581f4f1`,
  ID 12796456098, gerado pelo merge de teste da PR 1 com código em 0ba94d8.
- Módulo 1 concluído em branch e apresentado para revisão na PR 1. O produto
  completo ainda exige os módulos 2 e 3; não há deploy ou operação fiscal ativa.
