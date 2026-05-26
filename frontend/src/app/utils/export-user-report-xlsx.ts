import * as XLSX from 'xlsx';

export type UserReportSummaryRow = {
  id?: number;
  nome_completo?: string;
  email?: string;
  ativo?: boolean;
  setor_nome?: string;
  grupo_nome?: string;
  pontos?: number;
  bids_participados?: number;
  total_apostas?: number;
  apostas_ganhas?: number;
  apostas_perdidas?: number;
  apostas_pendentes?: number;
  total_pontos_apostados?: number;
  media_lance?: number;
  ingressos_ganhos?: number;
  wt_inscricoes_total?: number;
  wt_presentes?: number;
  wt_faltas?: number;
};

export type UserReportDetailPayload = {
  usuario?: { id?: number; nome_completo?: string };
  resumo?: UserReportSummaryRow;
  historico_pontos?: Array<{
    data_alteracao?: string;
    pontos_antes?: number;
    pontos_depois?: number;
    motivo?: string;
    admin_nome?: string;
  }>;
  apostas?: Array<{
    data_aposta?: string;
    partida_titulo?: string;
    partida_status?: string;
    data_jogo?: string;
    valor_pago?: number;
    status?: string;
  }>;
  wt_pass?: Array<{
    titulo?: string;
    data_evento?: string;
    inscricao_status?: string;
    posicao?: number;
    data_inscricao?: string;
    local?: string;
  }>;
};

function fmtData(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function rotuloAposta(s: string): string {
  if (s === 'GANHOU') return 'Ganhou';
  if (s === 'PERDEU') return 'Perdeu';
  if (s === 'PENDENTE') return 'Pendente';
  return s || '';
}

function nomeSeguro(nome: string | undefined, id?: number): string {
  const base = String(nome || `utilizador_${id ?? 'sem_id'}`)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 50);
  return base;
}

export function exportUsersReportSummaryXlsx(rows: UserReportSummaryRow[]): void {
  const head = [
    'ID',
    'Nome',
    'E-mail',
    'Ativo',
    'Setor',
    'Grupo',
    'Saldo (pts)',
    'BIDs participados',
    'Total apostas',
    'Apostas ganhas',
    'Pontos apostados',
    'Ingressos ganhos',
    'WT Pass inscrições',
    'WT presentes',
    'WT faltas',
  ];
  const linhas = rows.map((r) => [
    r.id ?? '',
    r.nome_completo ?? '',
    r.email ?? '',
    r.ativo ? 'Sim' : 'Não',
    r.setor_nome ?? '',
    r.grupo_nome ?? '',
    r.pontos ?? 0,
    r.bids_participados ?? 0,
    r.total_apostas ?? 0,
    r.apostas_ganhas ?? 0,
    r.total_pontos_apostados ?? 0,
    r.ingressos_ganhos ?? 0,
    r.wt_inscricoes_total ?? 0,
    r.wt_presentes ?? 0,
    r.wt_faltas ?? 0,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([head, ...linhas]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resumo');
  XLSX.writeFile(wb, 'Relatorio_utilizadores_resumo.xlsx');
}

export function exportUserReportDetailXlsx(data: UserReportDetailPayload): void {
  const u = data.usuario || {};
  const r = data.resumo || {};
  const id = u.id ?? r.id;
  const tituloSeguro = nomeSeguro(u.nome_completo ?? r.nome_completo, id);

  const headResumo = ['Campo', 'Valor'];
  const linhasResumo = [
    ['Nome', u.nome_completo ?? r.nome_completo ?? ''],
    ['E-mail', r.email ?? ''],
    ['Setor', r.setor_nome ?? ''],
    ['Grupo', r.grupo_nome ?? ''],
    ['Saldo atual (pts)', r.pontos ?? 0],
    ['BIDs participados', r.bids_participados ?? 0],
    ['Total apostas', r.total_apostas ?? 0],
    ['Apostas ganhas', r.apostas_ganhas ?? 0],
    ['Apostas perdidas', r.apostas_perdidas ?? 0],
    ['Pontos apostados', r.total_pontos_apostados ?? 0],
    ['Média lance', r.media_lance ?? 0],
    ['Ingressos ganhos', r.ingressos_ganhos ?? 0],
    ['WT Pass inscrições', r.wt_inscricoes_total ?? 0],
    ['WT presentes', r.wt_presentes ?? 0],
    ['WT faltas', r.wt_faltas ?? 0],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet([headResumo, ...linhasResumo]);

  const headPontos = ['Data', 'Antes', 'Depois', 'Motivo', 'Admin'];
  const linhasPontos = (data.historico_pontos || []).map((h) => [
    fmtData(h.data_alteracao),
    h.pontos_antes ?? '',
    h.pontos_depois ?? '',
    h.motivo ?? '',
    h.admin_nome ?? '',
  ]);
  const wsPontos = XLSX.utils.aoa_to_sheet([headPontos, ...linhasPontos]);

  const headAp = ['Data aposta', 'BID', 'Status BID', 'Data jogo', 'Lance (pts)', 'Resultado'];
  const linhasAp = (data.apostas || []).map((a) => [
    fmtData(a.data_aposta),
    a.partida_titulo ?? '',
    a.partida_status ?? '',
    fmtData(a.data_jogo),
    a.valor_pago ?? '',
    rotuloAposta(String(a.status ?? '')),
  ]);
  const wsAp = XLSX.utils.aoa_to_sheet([headAp, ...linhasAp]);

  const headWt = ['Evento', 'Data evento', 'Local', 'Estado inscrição', 'Posição', 'Data inscrição'];
  const linhasWt = (data.wt_pass || []).map((w) => [
    w.titulo ?? '',
    fmtData(w.data_evento),
    w.local ?? '',
    w.inscricao_status ?? '',
    w.posicao ?? '',
    fmtData(w.data_inscricao),
  ]);
  const wsWt = XLSX.utils.aoa_to_sheet([headWt, ...linhasWt]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
  XLSX.utils.book_append_sheet(wb, wsPontos, 'Pontos');
  XLSX.utils.book_append_sheet(wb, wsAp, 'Apostas');
  XLSX.utils.book_append_sheet(wb, wsWt, 'WT_Pass');
  XLSX.writeFile(wb, `Relatorio_utilizador_${id ?? 'sem_id'}_${tituloSeguro}.xlsx`);
}
