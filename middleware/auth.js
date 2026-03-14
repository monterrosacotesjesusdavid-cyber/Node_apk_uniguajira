const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Token requerido' });
  const token = auth.split(' ')[1];
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function soloProfesor(req, res, next) {
  if (req.usuario.rol !== 'profesor') return res.status(403).json({ error: 'Acceso denegado' });
  next();
}

function soloEstudiante(req, res, next) {
  if (req.usuario.rol !== 'estudiante') return res.status(403).json({ error: 'Acceso denegado' });
  next();
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  next();
}

module.exports = { verificarToken, soloProfesor, soloEstudiante, soloAdmin };
