const { ZodError } = require('zod');

function errorMiddleware(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed.',
      issues: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const status = Number(err.status || err.statusCode || 500);
  const message = err.message || 'Internal server error.';

  if (status >= 500) {
    console.error(err);
  }

  res.status(Number.isFinite(status) ? status : 500).json({ message });
}

module.exports = { errorMiddleware };
