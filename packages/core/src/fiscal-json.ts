/** Limite de memória por página; não confiar apenas no Content-Length. */
export async function lerJsonFiscal(resposta: Response): Promise<unknown> {
  const limite = 4 * 1024 * 1024;
  const tamanho = Number(resposta.headers.get("content-length"));
  if (Number.isFinite(tamanho) && tamanho > limite) {
    await resposta.body?.cancel();
    throw new Error("Listagem fiscal acima do limite.");
  }
  if (!resposta.body) throw new Error("Listagem fiscal vazia.");
  const reader = resposta.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limite) {
        await reader.cancel();
        throw new Error("Listagem fiscal acima do limite.");
      }
      partes.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let posicao = 0;
  for (const parte of partes) { bytes.set(parte, posicao); posicao += parte.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown; }
  catch { throw new Error("Listagem fiscal inválida."); }
}
