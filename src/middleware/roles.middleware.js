function requireRoles(...allowedRoles) {
  const allowedSet = new Set(
    allowedRoles.flatMap((role) =>
      typeof role === 'string' ? [role.toLowerCase()] : [],
    ),
  );

  return function rolesMiddleware(req, res, next) {
    const userRoles = (req.user?.roles || []).map((r) =>
      typeof r === 'string' ? r.toLowerCase() : '',
    );

    const hasRole = userRoles.some((role) => allowedSet.has(role));

    if (!hasRole) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    return next();
  };
}

module.exports = { requireRoles };
