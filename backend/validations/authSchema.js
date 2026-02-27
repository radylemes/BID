const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'string.empty': 'O campo usuário não pode estar vazio.',
    'any.required': 'O campo usuário é obrigatório.',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'O campo senha não pode estar vazio.',
    'any.required': 'O campo senha é obrigatório.',
  }),
});

module.exports = {
  loginSchema,
};
