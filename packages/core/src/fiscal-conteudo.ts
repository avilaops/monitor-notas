import { XMLParser, XMLValidator } from "fast-xml-parser";

const LIMITE_ARQUIVO_FISCAL = 12 * 1024 * 1024;
const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, processEntities: false });
const objeto = (valor: unknown): valor is Record<string, unknown> => !!valor && typeof valor === "object" && !Array.isArray(valor);

export type FormatoArquivoFiscal = "xml" | "pdf";

export class ErroConteudoFiscal extends Error {}

function texto(conteudo: string | Uint8Array): string {
  return typeof conteudo === "string" ? conteudo : new TextDecoder().decode(conteudo);
}

export function xmlNfeCompletoValido(conteudo: string | Uint8Array): boolean {
  const bytes = typeof conteudo === "string" ? new TextEncoder().encode(conteudo) : conteudo;
  if (!bytes.byteLength || bytes.byteLength > LIMITE_ARQUIVO_FISCAL) return false;
  const xml = texto(conteudo);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) return false;
  try {
    const raiz: unknown = parser.parse(xml);
    if (!objeto(raiz) || Object.keys(raiz).filter(chave => !chave.startsWith("?")).length !== 1) return false;
    const processo = raiz.nfeProc;
    if (!objeto(processo) || !objeto(processo.NFe) || !objeto(processo.NFe.infNFe)
      || !objeto(processo.protNFe) || !objeto(processo.protNFe.infProt)) return false;
    return processo.protNFe.infProt.cStat === "100";
  } catch { return false; }
}

export function pdfFiscalValido(conteudo: Uint8Array): boolean {
  return conteudo.byteLength > 5
    && conteudo.byteLength <= LIMITE_ARQUIVO_FISCAL
    && new TextDecoder().decode(conteudo.slice(0, 5)) === "%PDF-";
}

async function lerComLimite(resposta: Response): Promise<Uint8Array> {
  const tamanhoDeclarado = Number(resposta.headers.get("content-length"));
  if (Number.isFinite(tamanhoDeclarado) && tamanhoDeclarado > LIMITE_ARQUIVO_FISCAL) {
    throw new ErroConteudoFiscal("Arquivo fiscal excede o limite.");
  }
  if (!resposta.body) throw new ErroConteudoFiscal("Arquivo fiscal vazio.");

  const reader = resposta.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > LIMITE_ARQUIVO_FISCAL) {
      await reader.cancel();
      throw new ErroConteudoFiscal("Arquivo fiscal excede o limite.");
    }
    partes.push(value);
  }
  if (!total) throw new ErroConteudoFiscal("Arquivo fiscal vazio.");

  const conteudo = new Uint8Array(total);
  let posicao = 0;
  for (const parte of partes) {
    conteudo.set(parte, posicao);
    posicao += parte.byteLength;
  }
  return conteudo;
}

export async function lerRespostaArquivoFiscal(resposta: Response, formato: FormatoArquivoFiscal): Promise<Uint8Array> {
  const tipo = resposta.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
  if (formato === "pdf" ? tipo !== "application/pdf" : tipo !== "application/xml" && tipo !== "text/xml") {
    throw new ErroConteudoFiscal("Tipo do arquivo fiscal inválido.");
  }
  const conteudo = await lerComLimite(resposta);
  if (formato === "pdf" ? !pdfFiscalValido(conteudo) : !xmlNfeCompletoValido(conteudo)) {
    throw new ErroConteudoFiscal("Conteúdo do arquivo fiscal inválido.");
  }
  return conteudo;
}
