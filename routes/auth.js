const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');

// Login unificado — detecta si es estudiante o profesor
// Estudiante: identificador = username sin @ (ej: jdavidmonterrosa)
// Profesor:   identificador = cédula numérica
router.post('/login', async (req, res) => {
  const { identificador, codigo } = req.body;
  if (!identificador || !codigo)
    return res.status(400).json({ error: 'Identificador y código requeridos' });

  try {
    const esNumero = /^\d+$/.test(identificador);

    if (esNumero) {
      // Intentar como PROFESOR (cédula numérica)
      const [rows] = await db.query(
        'SELECT * FROM profesores WHERE cedula = ? AND activo = TRUE', [identificador]);
      if (rows.length > 0) {
        const prof = rows[0];
        const valido = await bcrypt.compare(codigo, prof.password_hash);
        if (!valido) return res.status(401).json({ error: 'Código incorrecto' });
        const token = jwt.sign(
          { id: prof.id, nombre: prof.nombre, rol: 'profesor' },
          process.env.JWT_SECRET, { expiresIn: '10h' }
        );
        return res.json({ token, nombre: prof.nombre, id: prof.id, rol: 'profesor' });
      }
    } else {
      // Intentar como ESTUDIANTE (username sin @)
      const [rows] = await db.query(
        'SELECT * FROM estudiantes WHERE username = ? AND activo = TRUE', [identificador]);
      if (rows.length > 0) {
        const est = rows[0];
        const valido = await bcrypt.compare(codigo, est.codigo_hash);
        if (!valido) return res.status(401).json({ error: 'Código incorrecto' });
        const token = jwt.sign(
          { id: est.id, nombre: est.nombre, rol: 'estudiante' },
          process.env.JWT_SECRET, { expiresIn: '10h' }
        );
        return res.json({ token, nombre: est.nombre, id: est.id, rol: 'estudiante' });
      }
    }

    return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login admin
router.post('/admin/login', async (req, res) => {
  const { correo, password } = req.body;
  if (!correo || !password)
    return res.status(400).json({ error: 'Correo y contraseña requeridos' });
  try {
    const [rows] = await db.query('SELECT * FROM admins WHERE correo = ?', [correo]);
    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const admin = rows[0];
    const valido = await bcrypt.compare(password, admin.password_hash);
    if (!valido) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const token = jwt.sign(
      { id: admin.id, nombre: admin.nombre, rol: 'admin' },
      process.env.JWT_SECRET, { expiresIn: '10h' }
    );
    res.json({ token, nombre: admin.nombre, id: admin.id, rol: 'admin' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
