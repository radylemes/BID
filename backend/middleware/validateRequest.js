const validateRequest = (schema) => {
  return (req, res, next) => {
    const { value, error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: false,
      convert: true, // Coerce strings to numbers when possible (evita 400 por partidaId/usuarioId como string)
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message.replace(/"/g, ''))
        .join(', ');
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[validateRequest] Body recebido:', JSON.stringify(req.body));
        console.warn('[validateRequest] Erro de validação:', errorMessage);
      }
      return res.status(400).json({ error: errorMessage });
    }

    req.body = value;
    next();
  };
};

module.exports = validateRequest;
