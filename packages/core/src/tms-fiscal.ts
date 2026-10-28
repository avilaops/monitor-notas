import { lerJsonFiscal } from "./fiscal-json.js";

type Ambiente = Record<string, string | undefined>;

export type CteTms = {
  id: string; coleta_id: string; rastreio: string | null; ambiente: "HOMOLOGACAO" | "PRODUCAO";
  serie: number; numero: number; chave: string; status: string; protocolo: string | null;
  codigo_status: number | null; motivo_status: string | null; emitido_em: string;
  autorizado_em: string | null; cancelado_em: string | null; protocolo_cancelamento: string | null;
  observado_em: string; arquivos: { xml: string | null; dacte: string | null };
  eventos: Array<{ id: string; tipo: string; sequencia: number; protocolo: string | null; codigo_status: number; motivo_status: string; registrado_em: string; cancelado_em: string | null }>;
};

export type FiscalTms = { documentos: CteTms[]; painelUrl: string; slug: string };

function configuracao(cnpj: string, env: Ambiente) {
  const api = env.TMS_API_URL?.replace(/\/$/, "") ?? "";
  const painel = env.TMS_APP_URL?.replace(/\/$/, "") || api;
  if (!/^https:\/\//.test(api) && env.NODE_ENV === "production") return null;
  let empresas: Record<string, unknown>;
  try {
    const lido: unknown = JSON.parse(env.TMS_FISCAL_BY_CNPJ ?? "{}");
    if (!registro(lido)) return null;
    empresas = lido;
  } catch { return null; }
  const item = empresas[cnpj];
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const slug = (item as Record<string, unknown>).slug;
  const key = (item as Record<string, unknown>).key;
  return api && typeof slug === "string" && /^[a-z0-9][a-z0-9-]{1,62}$/.test(slug) && typeof key === "string" && key.trim()
    ? { api, painel, slug, key: key.trim() } : null;
}

function registro(valor: unknown): valor is Record<string, unknown> {
  return !!valor && typeof valor === "object" && !Array.isArray(valor);
}

const textoOuNulo = (valor: unknown) => valor === null || typeof valor === "string";
const dataValida = (valor: unknown) => typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valor) && Number.isFinite(Date.parse(valor));
const dataOuNulo = (valor: unknown) => valor === null || dataValida(valor);

function eventoValido(evento: unknown): boolean {
  return registro(evento) && typeof evento.id === "string" && typeof evento.tipo === "string"
    && Number.isSafeInteger(evento.sequencia) && Number.isSafeInteger(evento.codigo_status)
    && textoOuNulo(evento.protocolo) && typeof evento.motivo_status === "string"
    && dataValida(evento.registrado_em) && dataOuNulo(evento.cancelado_em);
}

function cteValido(valor: unknown): valor is CteTms {
  if (!registro(valor)) return false;
  const cte = valor;
  const arquivos = cte.arquivos;
  return typeof cte.id === "string" && cte.id.length > 0 && typeof cte.coleta_id === "string" && typeof cte.chave === "string" && /^\d{44}$/.test(cte.chave)
    && Number.isSafeInteger(cte.serie) && Number.isSafeInteger(cte.numero) && typeof cte.status === "string" && dataValida(cte.emitido_em)
    && (cte.ambiente === "PRODUCAO" || cte.ambiente === "HOMOLOGACAO")
    && textoOuNulo(cte.rastreio) && textoOuNulo(cte.protocolo) && textoOuNulo(cte.motivo_status)
    && textoOuNulo(cte.protocolo_cancelamento) && (cte.codigo_status === null || Number.isSafeInteger(cte.codigo_status))
    && dataOuNulo(cte.autorizado_em) && dataOuNulo(cte.cancelado_em) && dataValida(cte.observado_em)
    && registro(arquivos) && textoOuNulo(arquivos.xml) && textoOuNulo(arquivos.dacte)
    && Array.isArray(cte.eventos) && cte.eventos.every(eventoValido);
}

export async function buscarFiscalTms(cnpj: string, fetcher: typeof fetch = fetch, env: Ambiente = process.env): Promise<FiscalTms | null> {
  const config = configuracao(cnpj.replace(/[^0-9A-Z]/gi, "").toUpperCase(), env);
  if (!config) return null;
  const url = `${config.api}/api/integracoes/lojas/v1/empresas/${encodeURIComponent(config.slug)}/documentos-fiscais/cte`;
  const documentos: CteTms[] = [];
  const ids = new Set<string>();
  const signal = AbortSignal.timeout(60_000);
  let paginas = 1;
  let total = 0;
  for (let pagina = 1; pagina <= paginas; pagina++) {
    const response = await fetcher(pagina === 1 ? url : `${url}?pagina=${pagina}`, {
      headers: { Authorization: `Bearer ${config.key}` }, cache: "no-store", redirect: "error", signal,
    });
    if (!response.ok) throw new Error(`TMS respondeu ${response.status} ao consultar CT-e.`);
    const body = await lerJsonFiscal(response);
    if (!registro(body) || body.versao !== "avila.fiscal.cte.v1" || body.fonte_canonica !== "TMS"
      || !Array.isArray(body.documentos) || body.documentos.length > 50 || !body.documentos.every(cteValido)
      || body.pagina !== pagina || !Number.isSafeInteger(body.paginas) || !Number.isSafeInteger(body.total)) {
      throw new Error("TMS devolveu uma lista fiscal inválida.");
    }
    const paginasRecebidas = body.paginas as number;
    const totalRecebido = body.total as number;
    if (paginasRecebidas < 1 || paginasRecebidas > 10_000 || totalRecebido < 0 || totalRecebido > paginasRecebidas * 50
      || (totalRecebido === 0 && (paginasRecebidas !== 1 || body.documentos.length !== 0))
      || (totalRecebido > 0 && body.documentos.length === 0)
      || (pagina > 1 && (paginasRecebidas !== paginas || totalRecebido !== total))) {
      throw new Error("TMS devolveu paginação fiscal inconsistente. Atualize a consulta.");
    }
    paginas = paginasRecebidas;
    total = totalRecebido;
    for (const documento of body.documentos as CteTms[]) {
      if (ids.has(documento.id)) throw new Error("TMS repetiu um documento entre páginas. Atualize a consulta.");
      ids.add(documento.id);
      documentos.push(documento);
    }
    if (documentos.length > total) throw new Error("TMS devolveu total fiscal inconsistente.");
  }
  if (documentos.length !== total) throw new Error("TMS devolveu um acervo fiscal incompleto. Atualize a consulta.");
  return { documentos, painelUrl: `${config.painel}/dashboard/fiscal/cte`, slug: config.slug };
}

export async function baixarFiscalTms(cnpj: string, id: string, formato: "xml" | "dacte", fetcher: typeof fetch = fetch, env: Ambiente = process.env): Promise<Response | null> {
  const config = configuracao(cnpj.replace(/[^0-9A-Z]/gi, "").toUpperCase(), env);
  if (!config || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !["xml", "dacte"].includes(formato)) return null;
  const url = `${config.api}/api/integracoes/lojas/v1/empresas/${encodeURIComponent(config.slug)}/documentos-fiscais/cte/${id}/${formato}`;
  return fetcher(url, { headers: { Authorization: `Bearer ${config.key}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
}
