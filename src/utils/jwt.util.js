const jwt = require('jsonwebtoken');
const { jwt: jwtCfg } = require('../config/env');

function signAuthToken(payload) {
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email,
      roles: payload.roles,
    },
    jwtCfg.secret,
    { expiresIn: jwtCfg.expiresIn },
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, jwtCfg.secret);
}

module.exports = { signAuthToken, verifyAuthToken };
