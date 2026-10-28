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
