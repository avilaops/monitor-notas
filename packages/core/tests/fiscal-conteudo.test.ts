import assert from "node:assert/strict";
import { test } from "node:test";
import { lerRespostaArquivoFiscal, pdfFiscalValido, xmlNfeCompletoValido } from "../src/fiscal-conteudo.js";

const xml = '<nfeProc><NFe><infNFe Id="sintetico"/></NFe><protNFe><infProt><cStat>100</cStat></infProt></protNFe></nfeProc>';

test("XML integral mantém os bytes recebidos no download", async () => {
  const conteudo = `<?xml version="1.0"?>\n${xml}\n`;
  const resultado = await lerRespostaArquivoFiscal(new Response(conteudo, { headers: { "Content-Type": "application/xml; charset=utf-8" } }), "xml");
  assert.equal(new TextDecoder().decode(resultado), conteudo);
});

test("resumo e XML com entidades não se tornam arquivo integral", () => {
  assert.equal(xmlNfeCompletoValido("<resNFe/>"), false);
  assert.equal(xmlNfeCompletoValido(`<!DOCTYPE nfeProc>${xml}`), false);
  assert.equal(xmlNfeCompletoValido(xml.replace("100", "110")), false);
});

test("download recusa tipo, arquivo vazio e tamanho declarado acima do teto", async () => {
  await assert.rejects(lerRespostaArquivoFiscal(new Response("<html>erro</html>", { headers: { "Content-Type": "text/html" } }), "pdf"));
  await assert.rejects(lerRespostaArquivoFiscal(new Response("", { headers: { "Content-Type": "application/pdf" } }), "pdf"));
  await assert.rejects(lerRespostaArquivoFiscal(new Response("%PDF-ok", { headers: { "Content-Type": "application/pdf", "Content-Length": String(13 * 1024 * 1024) } }), "pdf"));
  assert.equal(pdfFiscalValido(new TextEncoder().encode("<html>erro</html>")), false);
});

test("limita streaming mesmo quando Content-Length não está presente", async () => {
  let cancelado = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array(7 * 1024 * 1024)); },
    cancel() { cancelado = true; },
  });
  await assert.rejects(lerRespostaArquivoFiscal(new Response(stream, { headers: { "Content-Type": "application/pdf" } }), "pdf"), /excede o limite/);
  assert.equal(cancelado, true);
});
