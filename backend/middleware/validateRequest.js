const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false, // Include all errors
      allowUnknown: true, // Allow extra fields not defined in the schema to pass
      stripUnknown: false,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message.replace(/"/g, ''))
        .join(', ');
      return res.status(400).json({ error: errorMessage });
    }

    next();
  };
};

module.exports = validateRequest;
