const Joi = require('joi');

const placeBetSchema = Joi.object({
  partidaId: Joi.number().integer().required().messages({
    'number.base': 'ID da partida deve ser um número.',
    'any.required': 'ID da partida é obrigatório.',
  }),
  usuarioId: Joi.number().integer().required().messages({
    'number.base': 'ID do usuário deve ser um número.',
    'any.required': 'ID do usuário é obrigatório.',
  }),
  valorApostado: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Valor do lance deve ser um número.',
    'number.min': 'O valor do lance deve ser maior que zero.',
  }),
  valores: Joi.array().items(Joi.number().integer().min(1)).max(4).optional().messages({
    'array.max': 'Máximo de 4 lances permitidos.',
    'number.min': 'Os valores dos lances devem ser maiores que zero.',
  })
}).or('valorApostado', 'valores').messages({
  'object.missing': 'É necessário enviar pelo menos um lance (valorApostado ou valores).',
});

const finishMatchSchema = Joi.object({
  partidaId: Joi.number().integer().required().messages({
    'number.base': 'ID da partida deve ser um número.',
    'any.required': 'ID da partida é obrigatório.',
  }),
  adminId: Joi.number().integer().optional(),
  motivo: Joi.string().allow('', null).optional(),
});

const redistribuirSchema = Joi.object({
  partidaDestinoId: Joi.number().integer().required().messages({
    'number.base': 'O BID receptor (partidaDestinoId) deve ser um número.',
    'any.required': 'O BID receptor é obrigatório.',
  }),
  quantidade: Joi.number().integer().min(1).optional().messages({
    'number.base': 'A quantidade deve ser um número.',
    'number.min': 'A quantidade deve ser pelo menos 1.',
  }),
  adminId: Joi.number().integer().optional(),
  motivo: Joi.string().min(1).required().messages({
    'string.empty': 'O motivo da redistribuição é obrigatório.',
    'any.required': 'O motivo da redistribuição é obrigatório.',
  }),
});

const acrescentarIngressosSchema = Joi.object({
  quantidade: Joi.number().integer().min(1).required().messages({
    'number.base': 'A quantidade deve ser um número.',
    'number.min': 'A quantidade deve ser pelo menos 1.',
    'any.required': 'A quantidade de ingressos é obrigatória.',
  }),
  adminId: Joi.number().integer().optional(),
  motivo: Joi.string().min(1).required().messages({
    'string.empty': 'O motivo é obrigatório para auditoria.',
    'any.required': 'O motivo é obrigatório.',
  }),
});

module.exports = {
  placeBetSchema,
  finishMatchSchema,
  redistribuirSchema,
  acrescentarIngressosSchema,
};
