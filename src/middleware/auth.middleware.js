const { verifyAuthToken } = require('../utils/jwt.util');

function authenticate() {
  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization;

    if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const token = header.slice('Bearer '.length).trim();

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const payload = verifyAuthToken(token);

      req.user = {
        id: payload.sub,
        email: payload.email,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
      };

      return next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
  };
}

module.exports = { authenticate };
