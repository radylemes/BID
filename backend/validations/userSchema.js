const Joi = require('joi');

const createUserSchema = Joi.object({
  nome_completo: Joi.string().required().messages({
    'string.empty': 'O campo nome completo não pode estar vazio.',
    'any.required': 'O campo nome completo é obrigatório.',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Formato de e-mail inválido.',
    'string.empty': 'O campo e-mail não pode estar vazio.',
    'any.required': 'O campo e-mail é obrigatório.',
  }),
  username: Joi.string().required().messages({
    'string.empty': 'O campo usuário não pode estar vazio.',
    'any.required': 'O campo usuário é obrigatório.',
  }),
  senha: Joi.string().min(6).required().messages({
    'string.min': 'A senha deve ter pelo menos 6 caracteres.',
    'string.empty': 'O campo senha não pode estar vazio.',
    'any.required': 'A senha é obrigatória.',
  }),
  perfil: Joi.string().valid('ADMIN', 'USER', 'PORTARIA').optional(),
  empresa_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().valid('null', '')).optional(),
  setor_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().valid('null', '')).optional(),
  grupo_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().valid('null', '')).optional(),
  pontos: Joi.number().integer().min(0).optional(),
  motivo: Joi.string().allow('', null).optional(),
  adminId: Joi.number().integer().optional(),
});

const batchPointsSchema = Joi.object({
  targetType: Joi.string().valid('all', 'empresas', 'setores', 'users').required().messages({
    'any.only': 'Tipo de alvo inválido.',
    'any.required': 'O tipo de alvo é obrigatório.',
  }),
  targetIds: Joi.array().items(Joi.number().integer()).optional(),
  points: Joi.number().integer().greater(0).required().messages({
    'number.greater': 'A quantidade de pontos deve ser maior que zero.',
    'any.required': 'A quantidade de pontos é obrigatória.',
  }),
  motive: Joi.string().required().messages({
    'string.empty': 'A justificativa é obrigatória.',
    'any.required': 'A justificativa é obrigatória.',
  }),
  adminId: Joi.number().integer().optional(),
});

module.exports = {
  createUserSchema,
  batchPointsSchema,
};
