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
- [ ] CI: testes sintéticos, typecheck, compilação e artefato consumível.

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

- 28/10/2026: destino confirmado pelo usuário; repositório privado criado.
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
