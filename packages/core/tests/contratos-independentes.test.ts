import assert from "node:assert/strict";
import { test } from "node:test";
import { buscarFiscalTms } from "../src/tms-fiscal.js";
import { buscarFiscalErp } from "../src/erp-fiscal.js";
import { resumirDocumentoFiscal } from "../src/fiscal-documento.js";
import { deduplicarDocumentosFiscais } from "../src/fiscal-lista.js";

const cnpj = "60067738000106";
const env = { NODE_ENV: "production", TMS_API_URL: "https://tms.example", TMS_FISCAL_BY_CNPJ: JSON.stringify({ [cnpj]: { slug: "empresa", key: "credencial-sintetica" } }) };
const documento = (id: string) => ({
  id, coleta_id: "carga", rastreio: null, ambiente: "PRODUCAO", serie: 1, numero: 2,
  chave: "3".repeat(44), status: "AUTHORIZED", protocolo: "1", codigo_status: 100,
  motivo_status: "Autorizado", emitido_em: "2026-10-28T00:00:00Z", autorizado_em: "2026-10-28T00:00:00Z",
  cancelado_em: null, protocolo_cancelamento: null, observado_em: "2026-10-28T00:00:00Z",
  arquivos: { xml: "/xml", dacte: "/dacte" }, eventos: [],
});
const pagina = (numero: number, documentos = [documento(String(numero))]) => ({ versao: "avila.fiscal.cte.v1", fonte_canonica: "TMS", pagina: numero, paginas: 2, total: 2, documentos });

test("TMS percorre todas as páginas sem expor credencial na URL", async () => {
  const urls: string[] = [];
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input); urls.push(url);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer credencial-sintetica");
    assert.equal(init?.redirect, "error");
    return Response.json(pagina(url.includes("pagina=2") ? 2 : 1));
  }) as typeof fetch;
  const resultado = await buscarFiscalTms(cnpj, fetcher, env);
  assert.deepEqual(resultado?.documentos.map(d => d.id), ["1", "2"]);
  assert.equal(urls.length, 2);
  assert.ok(urls[1].endsWith("?pagina=2"));
  assert.ok(urls.every(url => !url.includes("credencial-sintetica")));
});

test("TMS não devolve acervo parcial quando uma página falha", async () => {
  const fetcher = (async (input: string | URL | Request) => String(input).includes("pagina=2")
    ? new Response(null, { status: 503 }) : Response.json(pagina(1))) as typeof fetch;
  await assert.rejects(buscarFiscalTms(cnpj, fetcher, env), /503/);
});

test("TMS recusa paginação ausente, repetida, alterada ou excessiva", async () => {
  for (const body of [
    { versao: "avila.fiscal.cte.v1", documentos: [] },
    { ...pagina(1), paginas: 10_001 },
    { ...pagina(1), pagina: 0 },
    { ...pagina(1), documentos: [] },
  ]) {
    await assert.rejects(buscarFiscalTms(cnpj, (async () => Response.json(body)) as typeof fetch, env));
  }
  await assert.rejects(buscarFiscalTms(cnpj, (async () => Response.json(pagina(1))) as typeof fetch, env));
  await assert.rejects(buscarFiscalTms(cnpj, (async (url: string | URL | Request) => Response.json(
    String(url).includes("pagina=2") ? { ...pagina(2), total: 3 } : pagina(1),
  )) as typeof fetch, env));
});

test("TMS recusa documento repetido entre páginas e total incompatível", async () => {
  const fetcher = (async (url: string | URL | Request) => Response.json(pagina(
    String(url).includes("pagina=2") ? 2 : 1, [documento("mesmo")],
  ))) as typeof fetch;
  await assert.rejects(buscarFiscalTms(cnpj, fetcher, env));
  await assert.rejects(buscarFiscalTms(cnpj, (async () => Response.json({ ...pagina(1), paginas: 1, total: 4 })) as typeof fetch, env));
});

test("CNPJ não configurado não dispara requisição para ERP ou TMS", async () => {
  const semRede = (async () => { assert.fail("acesso externo indevido"); }) as typeof fetch;
  assert.equal(await buscarFiscalTms("outra-empresa", semRede, env), null);
  assert.equal(await buscarFiscalErp("outra-empresa", semRede, {}), null);
});

test("mapas de credenciais malformados são tratados como não configurados", async () => {
  const semRede = (async () => { assert.fail("acesso externo indevido"); }) as typeof fetch;
  for (const mapa of ["null", "[]", "1", "{invalido"]) {
    assert.equal(await buscarFiscalTms(cnpj, semRede, { ...env, TMS_FISCAL_BY_CNPJ: mapa }), null);
    assert.equal(await buscarFiscalErp(cnpj, semRede, { NODE_ENV: "production", ERP_API_URL: "https://erp.example", ERP_API_KEYS_BY_CNPJ: mapa }), null);
  }
});

test("TMS recusa evento remoto sem identificação e acervo com origem errada", async () => {
  for (const body of [
    { ...pagina(1), fonte_canonica: "OUTRO" },
    { ...pagina(1), documentos: [{ ...documento("1"), eventos: [{}] }] },
  ]) {
    await assert.rejects(buscarFiscalTms(cnpj, (async () => Response.json(body)) as typeof fetch, env), /inválida/);
  }
});

test("TMS aceita acervo vazio quando total e paginação concordam", async () => {
  const resultado = await buscarFiscalTms(cnpj, (async () => Response.json({ ...pagina(1), paginas: 1, total: 0, documentos: [] })) as typeof fetch, env);
  assert.deepEqual(resultado?.documentos, []);
});

test("metadados numéricos ausentes permanecem nulos", () => {
  const resumo = resumirDocumentoFiscal("<resNFe><xNome>Fornecedor</xNome></resNFe>", "resNFe.xsd", null);
  assert.equal(resumo.valorCentavos, null);
  const evento = resumirDocumentoFiscal("<resEvento><tpEvento>110111</tpEvento></resEvento>", "resEvento.xsd", null);
  assert.equal(evento.eventoSequencia, null);
});

test("deduplicação preserva eventos distintos da mesma chave", () => {
  const doc = { id: "nota", chave: "3".repeat(44), nsu: "1", tipo: "NFE", situacao: "COMPLETA", recebidoEm: "2026-10-28" };
  const evento1 = { ...doc, id: "evento-1", nsu: "2", tipo: "EVENTO", situacao: "EVENTO" };
  const evento2 = { ...evento1, id: "evento-2", nsu: "3" };
  assert.deepEqual(deduplicarDocumentosFiscais([doc, evento1, evento2, evento1]), [doc, evento1, evento2]);
});
