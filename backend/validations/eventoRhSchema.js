const Joi = require("joi");

const createEventoSchema = Joi.object({
  titulo: Joi.string().allow("", null).max(255).optional(),
  banner: Joi.string().allow("", null).max(500).optional(),
  subtitulo: Joi.string().allow("", null).max(255).optional(),
  descricao: Joi.string().allow("", null).optional(),
  local: Joi.string().allow("", null).max(255).optional(),
  data_inicio_inscricao: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  data_limite_inscricao: Joi.alternatives().try(Joi.date(), Joi.string()).required().messages({
    "any.required": "Data limite de inscrição é obrigatória.",
  }),
  data_evento: Joi.alternatives().try(Joi.date(), Joi.string()).required().messages({
    "any.required": "Data do evento é obrigatória.",
  }),
  vagas: Joi.number().integer().min(1).max(10000).default(1),
  permitir_lista_espera: Joi.boolean().optional(),
  auto_encerrar: Joi.boolean().optional(),
  /** Partida (BID) associada — recepção unificada e wizard do BID. */
  partida_id: Joi.number().integer().allow(null).optional(),
  adminId: Joi.number().integer().optional(),
});

const updateEventoSchema = Joi.object({
  titulo: Joi.string().allow("", null).max(255).optional(),
  banner: Joi.string().allow("", null).max(500).optional(),
  subtitulo: Joi.string().allow("", null).max(255).optional(),
  descricao: Joi.string().allow("", null).optional(),
  local: Joi.string().allow("", null).max(255).optional(),
  data_inicio_inscricao: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  data_limite_inscricao: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  data_evento: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  vagas: Joi.number().integer().min(1).max(10000).optional(),
  permitir_lista_espera: Joi.boolean().optional(),
  auto_encerrar: Joi.boolean().optional(),
  status: Joi.string().valid("ABERTO", "ENCERRADO", "REALIZADO", "CANCELADO").optional(),
  partida_id: Joi.number().integer().allow(null).optional(),
  adminId: Joi.number().integer().optional(),
  /** Obrigatório em toda atualização (registo obrigatório de auditoria). */
  motivo: Joi.string().trim().min(3).max(255).required().messages({
    "any.required": "Indique o motivo para auditoria.",
    "string.min": "O motivo deve ter pelo menos 3 caracteres.",
    "string.empty": "Indique o motivo para auditoria.",
  }),
});

const inscreverSchema = Joi.object({
  aceitou_politica: Joi.boolean().valid(true).required().messages({
    "any.only": "É obrigatório aceitar a política de acesso para se inscrever.",
    "any.required": "É obrigatório aceitar a política de acesso para se inscrever.",
  }),
});

const marcarPresencaSchema = Joi.object({
  usuario_id: Joi.number().integer().required().messages({
    "any.required": "ID do utilizador é obrigatório.",
  }),
  status: Joi.string().valid("PRESENTE", "FALTOU").required().messages({
    "any.only": "Status deve ser PRESENTE ou FALTOU.",
    "any.required": "Status é obrigatório.",
  }),
  adminId: Joi.number().integer().optional(),
});

module.exports = {
  createEventoSchema,
  updateEventoSchema,
  inscreverSchema,
  marcarPresencaSchema,
};
