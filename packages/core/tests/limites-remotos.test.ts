import assert from "node:assert/strict";
import { test } from "node:test";
import { buscarFiscalTms } from "../src/tms-fiscal.js";
import { buscarFiscalErp } from "../src/erp-fiscal.js";
import { xmlNfeCompletoValido } from "../src/fiscal-conteudo.js";

test("comentários, múltiplas raízes e estrutura inválida não são NF-e integral", () => {
  for (const xml of [
    "<root><!-- <nfeProc><NFe><infNFe><protNFe><infProt><cStat>100</cStat> --></root>",
    "<nfeProc><NFe><infNFe/></NFe><protNFe><infProt><cStat>100</cStat></infProt></protNFe>",
    "<nfeProc><NFe><infNFe Id='1'/></NFe><protNFe><infProt><cStat>100</cStat></infProt></protNFe></nfeProc><outra/>",
  ]) assert.equal(xmlNfeCompletoValido(xml), false);
});

test("listagens ERP e TMS cancelam stream acima do limite", async () => {
  const cnpj = "60067738000106";
  for (const origem of ["ERP", "TMS"]) {
    let cancelado = false;
    const fetcher = (async () => new Response(new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(3 * 1024 * 1024)); },
      cancel() { cancelado = true; },
    }), { headers: { "Content-Type": "application/json" } })) as typeof fetch;
    const promessa = origem === "ERP"
      ? buscarFiscalErp(cnpj, fetcher, { ERP_API_URL: "https://erp.example", ERP_API_KEYS_BY_CNPJ: JSON.stringify({ [cnpj]: "sintetica" }) })
      : buscarFiscalTms(cnpj, fetcher, { TMS_API_URL: "https://tms.example", TMS_FISCAL_BY_CNPJ: JSON.stringify({ [cnpj]: { slug: "empresa", key: "sintetica" } }) });
    await assert.rejects(promessa, /limite/);
    assert.equal(cancelado, true);
  }
});
