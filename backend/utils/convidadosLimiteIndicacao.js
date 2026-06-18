const DEFAULT_HORAS = 24;
const DEFAULT_DIRECAO = "antes";
const MAX_HORAS = 720;

function parseHorasLimiteIndicacao(valor) {
  const n = Math.floor(Number(valor));
  if (!Number.isFinite(n) || n < 0) return DEFAULT_HORAS;
  return Math.min(n, MAX_HORAS);
}

function parseDirecaoLimiteIndicacao(valor) {
  const s = String(valor ?? "")
    .toLowerCase()
    .trim();
  if (s === "depois" || s === "after" || s === "pos") return "depois";
  return "antes";
}

function calcularLimiteIndicacao(dataJogo, horas, direcao) {
  if (dataJogo == null || dataJogo === "") return null;
  const inicioEvento = new Date(dataJogo);
  if (Number.isNaN(inicioEvento.getTime())) return null;

  const horasNorm = parseHorasLimiteIndicacao(horas);
  const dir = parseDirecaoLimiteIndicacao(direcao);
  const offsetMs = horasNorm * 60 * 60 * 1000;

  const limite = new Date(inicioEvento.getTime());
  if (dir === "depois") {
    limite.setTime(limite.getTime() + offsetMs);
  } else {
    limite.setTime(limite.getTime() - offsetMs);
  }
  return limite;
}

async function getLimiteIndicacaoConvidadosConfig(db) {
  const [rows] = await db.query(
    "SELECT chave, valor FROM configuracoes WHERE chave IN ('convidados_limite_indicacao_horas', 'convidados_limite_indicacao_direcao')",
  );
  const mapa = rows.reduce((acc, r) => {
    acc[r.chave] = r.valor;
    return acc;
  }, {});

  return {
    convidados_limite_indicacao_horas: parseHorasLimiteIndicacao(
      mapa.convidados_limite_indicacao_horas,
    ),
    convidados_limite_indicacao_direcao: parseDirecaoLimiteIndicacao(
      mapa.convidados_limite_indicacao_direcao,
    ),
  };
}

module.exports = {
  DEFAULT_HORAS,
  DEFAULT_DIRECAO,
  MAX_HORAS,
  parseHorasLimiteIndicacao,
  parseDirecaoLimiteIndicacao,
  calcularLimiteIndicacao,
  getLimiteIndicacaoConvidadosConfig,
};
