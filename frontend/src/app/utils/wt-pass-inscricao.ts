/** Tolerância alinhada a `statusBadge` / regras de inscrição no backend (60s). */
const BUF_MS = 60_000;

export type SeloDestaqueWtPass = { texto: string; tone: 'amber' | 'emerald' | 'slate' };

/** Estado na BD em que o colaborador ainda pode cancelar a inscrição (até o prazo de 24h). */
export function eventoStatusPermiteCancelarInscricaoWtPass(ev: {
  status?: string | null;
  evento_status?: string | null;
}): boolean {
  const st = String(ev?.status ?? ev?.evento_status ?? '')
    .toUpperCase()
    .trim();
  return st === 'ABERTO' || st === 'ENCERRADO';
}

/** Inscrições ainda dentro do período (calendário): evento `ABERTO` e entre início e fim. */
export function periodoInscricaoAindaAtivoWtPass(ev: {
  status?: string | null;
  evento_status?: string | null;
  data_inicio_inscricao?: string | null;
  data_limite_inscricao?: string | null;
}): boolean {
  const agora = Date.now();
  const st = String(ev?.status ?? ev?.evento_status ?? '')
    .toUpperCase()
    .trim();
  if (st !== 'ABERTO') return false;
  const ini = ev?.data_inicio_inscricao ? new Date(ev.data_inicio_inscricao).getTime() : 0;
  const lim = ev?.data_limite_inscricao ? new Date(ev.data_limite_inscricao).getTime() : 0;
  if (ini && agora < ini - BUF_MS) return false;
  if (lim && agora > lim + BUF_MS) return false;
  return true;
}

function situacaoInscricao(ev: { meu_status?: string; inscricao_status?: string }): string {
  const raw = ev.meu_status ?? ev.inscricao_status;
  if (raw == null || raw === '') return '';
  const s = String(raw).toUpperCase().trim();
  // Legado / texto de UI antigo — tratar como inscrição com vaga
  if (s === 'CONFIRMADO') return 'INSCRITO';
  return s;
}

const PARTICIPOU = new Set(['INSCRITO', 'FILA_ESPERA', 'PRESENTE', 'FALTOU', 'CANCELADO']);

/**
 * Texto do cartão «Situação» (lista WT Pass, histórico).
 * INSCRITO: «Aguardando encerramento» enquanto o período de inscrições está ativo; depois «Vaga confirmada».
 */
export function rotuloSituacaoInscricaoWtPass(
  ev: {
    status?: string | null;
    evento_status?: string | null;
    data_inicio_inscricao?: string | null;
    data_limite_inscricao?: string | null;
    meu_status?: string;
    inscricao_status?: string;
  },
  quandoNaoParticipou: string,
  /** Se definido, deve coincidir com o badge «Aberto» na UI (fonte de verdade do período de inscrições). */
  inscricoesAbertasNaUi?: boolean,
): string {
  const s = situacaoInscricao(ev);
  if (!s || !PARTICIPOU.has(s)) return quandoNaoParticipou;
  if (s === 'FALTOU') return 'Não compareceu';
  if (s === 'INSCRITO') {
    const ativo =
      inscricoesAbertasNaUi !== undefined
        ? inscricoesAbertasNaUi
        : periodoInscricaoAindaAtivoWtPass(ev);
    return ativo ? 'Aguardando encerramento' : 'Vaga confirmada';
  }
  if (s === 'PRESENTE') return 'Presente';
  if (s === 'FILA_ESPERA') return 'Lista de espera';
  if (s === 'CANCELADO') return 'Cancelado';
  return s;
}

/** Selo sobre a imagem (lista «disponíveis» / histórico WT Pass). */
export function seloDestaqueWtPass(
  ev: {
    status?: string | null;
    evento_status?: string | null;
    data_inicio_inscricao?: string | null;
    data_limite_inscricao?: string | null;
    meu_status?: string;
    inscricao_status?: string;
  },
  inscricoesAbertasNaUi?: boolean,
): SeloDestaqueWtPass | null {
  const s = situacaoInscricao(ev);
  if (s === 'FALTOU') return { texto: 'Não compareceu', tone: 'slate' };
  if (s === 'INSCRITO') {
    const ativo =
      inscricoesAbertasNaUi !== undefined
        ? inscricoesAbertasNaUi
        : periodoInscricaoAindaAtivoWtPass(ev);
    if (ativo) {
      return { texto: 'Aguardando encerramento', tone: 'amber' };
    }
    return { texto: '🏆 Vaga confirmada', tone: 'emerald' };
  }
  if (s === 'PRESENTE') return { texto: 'Presente', tone: 'emerald' };
  return null;
}
