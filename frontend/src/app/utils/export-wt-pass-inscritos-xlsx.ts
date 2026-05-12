import * as XLSX from 'xlsx';
import { normalizarCpfDigits } from './cpf';

/** Linha de inscrito compatível com a lista do modal WT Pass e com `GET /eventos-rh/:id` (inscritos). */
export type WtPassInscritoExportRow = {
  posicao_exibicao?: number;
  posicao?: number;
  nome_completo?: string;
  cpf?: unknown;
  setor_nome?: string;
  status?: string;
};

export function exportWtPassInscritosXlsx(
  ev: { id?: number; titulo?: string | null },
  rows: WtPassInscritoExportRow[],
): void {
  const tituloSeguro = String(ev?.titulo || 'evento')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 50);
  const head = ['#', 'Nome', 'CPF', 'Setor', 'Estado', 'Chamada'];
  const dados: unknown[][] = [head];
  for (const r of rows) {
    const st = String(r.status || '');
    let chamada = '—';
    if (st === 'PRESENTE') chamada = 'Presente';
    else if (st === 'FALTOU') chamada = 'Faltou';
    else if (st === 'INSCRITO' || st === 'FILA_ESPERA') chamada = 'Pendente';
    dados.push([
      r.posicao_exibicao ?? r.posicao,
      r.nome_completo ?? '',
      normalizarCpfDigits(r.cpf) || '',
      r.setor_nome || '',
      st,
      chamada,
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');
  const idPart = ev?.id != null ? String(ev.id) : 'sem_id';
  XLSX.writeFile(wb, `WT_Pass_inscritos_${idPart}_${tituloSeguro}.xlsx`);
}
