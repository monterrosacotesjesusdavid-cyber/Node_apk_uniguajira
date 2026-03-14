const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// Dashboard
router.get('/dashboard', verificarToken, soloAdmin, async (req, res) => {
  try {
    const [[{ total_profesores }]] = await db.query(
      'SELECT COUNT(*) AS total_profesores FROM profesores WHERE activo = TRUE');
    const [[{ presentes_hoy }]] = await db.query(`
      SELECT COUNT(DISTINCT profesor_id) AS presentes_hoy
      FROM asistencias WHERE fecha = CURDATE() AND estado != 'ausente'`);
    const [[{ tardanzas_hoy }]] = await db.query(`
      SELECT COUNT(*) AS tardanzas_hoy
      FROM asistencias WHERE fecha = CURDATE() AND estado = 'tardanza'`);
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const diaHoy = dias[new Date().getDay()];
    const [[{ total_clases_hoy }]] = await db.query(
      'SELECT COUNT(*) AS total_clases_hoy FROM horarios WHERE dia_semana = ? AND activo = TRUE',
      [diaHoy]);
    const ausentes_hoy = Math.max(0, total_clases_hoy - presentes_hoy);
    res.json({ total_profesores, presentes_hoy, tardanzas_hoy, total_clases_hoy, ausentes_hoy });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
});

// Lista de profesores paginada con búsqueda (para 5000+)
router.get('/profesores', verificarToken, soloAdmin, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 30;
    const q     = req.query.q ? `%${req.query.q}%` : '%';
    const offset = (page - 1) * limit;

    const [rows] = await db.query(`
      SELECT id, nombre, correo, cedula, activo, creado_en
      FROM profesores
      WHERE activo = TRUE AND (nombre LIKE ? OR cedula LIKE ?)
      ORDER BY nombre
      LIMIT ? OFFSET ?
    `, [q, q, limit, offset]);

    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total FROM profesores
      WHERE activo = TRUE AND (nombre LIKE ? OR cedula LIKE ?)
    `, [q, q]);

    res.json({ profesores: rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener profesores' });
  }
});

// Estadísticas paginadas por profesor
router.get('/estadisticas', verificarToken, soloAdmin, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 30;
    const q     = req.query.q ? `%${req.query.q}%` : '%';
    const offset = (page - 1) * limit;

    const [rows] = await db.query(`
      SELECT p.id, p.nombre, p.cedula,
        COUNT(CASE WHEN a.estado = 'a_tiempo'  THEN 1 END) AS a_tiempo,
        COUNT(CASE WHEN a.estado = 'tardanza'  THEN 1 END) AS tardanzas,
        COUNT(CASE WHEN a.estado = 'ausente'   THEN 1 END) AS ausencias
      FROM profesores p
      LEFT JOIN asistencias a ON p.id = a.profesor_id
      WHERE p.activo = TRUE AND (p.nombre LIKE ? OR p.cedula LIKE ?)
      GROUP BY p.id, p.nombre, p.cedula
      ORDER BY p.nombre
      LIMIT ? OFFSET ?
    `, [q, q, limit, offset]);

    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total FROM profesores
      WHERE activo = TRUE AND (nombre LIKE ? OR cedula LIKE ?)
    `, [q, q]);

    res.json({ profesores: rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Detalle de un profesor
router.get('/profesores/:id/detalle', verificarToken, soloAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const [[prof]] = await db.query(
      'SELECT id, nombre, correo, cedula FROM profesores WHERE id = ?', [id]);
    if (!prof) return res.status(404).json({ error: 'Profesor no encontrado' });

    const [[stats]] = await db.query(`
      SELECT
        COUNT(CASE WHEN estado = 'a_tiempo' THEN 1 END) AS a_tiempo,
        COUNT(CASE WHEN estado = 'tardanza' THEN 1 END) AS tardanzas,
        COUNT(CASE WHEN estado = 'ausente'  THEN 1 END) AS ausencias
      FROM asistencias WHERE profesor_id = ?
    `, [id]);

    const [historial] = await db.query(`
      SELECT a.fecha, a.hora_registro, a.estado, a.minutos_tarde,
             h.materia, s.nombre_completo AS salon
      FROM asistencias a
      JOIN horarios h ON a.horario_id = h.id
      JOIN salones s ON h.salon_id = s.id
      WHERE a.profesor_id = ?
      ORDER BY a.fecha DESC, a.hora_registro DESC
      LIMIT 60
    `, [id]);

    res.json({ ...prof, estadisticas: stats, historial });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener detalle' });
  }
});

// Asistencias con filtros
router.get('/asistencias', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { fecha, profesor_id } = req.query;
    let query = `
      SELECT a.*, p.nombre AS profesor_nombre, p.cedula,
             h.materia, h.hora_inicio, s.nombre_completo AS salon
      FROM asistencias a
      JOIN profesores p ON a.profesor_id = p.id
      JOIN horarios h ON a.horario_id = h.id
      JOIN salones s ON h.salon_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (fecha)       { query += ' AND a.fecha = ?';         params.push(fecha); }
    if (profesor_id) { query += ' AND a.profesor_id = ?';   params.push(profesor_id); }
    query += ' ORDER BY a.fecha DESC, a.hora_registro DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// Crear profesor
router.post('/profesores', verificarToken, soloAdmin, async (req, res) => {
  const { nombre, correo, cedula, password } = req.body;
  if (!nombre || !correo || !cedula || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      'INSERT INTO profesores (nombre, correo, cedula, password_hash) VALUES (?,?,?,?)',
      [nombre, correo, cedula, hash]);
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'Cédula o correo ya registrado' });
    res.status(500).json({ error: 'Error al crear profesor' });
  }
});

// Crear estudiante
router.post('/estudiantes', verificarToken, soloAdmin, async (req, res) => {
  const { nombre, username, codigo } = req.body;
  if (!nombre || !username || !codigo)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  try {
    const hash = await bcrypt.hash(codigo, 10);
    const [r] = await db.query(
      'INSERT INTO estudiantes (nombre, username, codigo_hash) VALUES (?,?,?)',
      [nombre, username, hash]);
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'Username ya registrado' });
    res.status(500).json({ error: 'Error al crear estudiante' });
  }
});

// Otorgar horario
router.post('/otorgar-horario', verificarToken, soloAdmin, async (req, res) => {
  const { profesor_id, codigo_salon, materia, dia_semana, hora_inicio, hora_fin } = req.body;
  if (!profesor_id || !codigo_salon || !materia || !dia_semana || !hora_inicio || !hora_fin)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  const codigo = codigo_salon.toString().padStart(4, '0');
  const bloque_num   = codigo[0];
  const piso_num     = codigo[1];
  const salon_num    = codigo.slice(2);
  const bloque_nombre = `Bloque ${bloque_num}`;
  const nombre_completo = `Bloque ${bloque_num} - Piso ${piso_num} - Salón ${salon_num}`;

  try {
    let bloque_id;
    const [bloques] = await db.query(
      'SELECT id FROM bloques WHERE nombre = ?', [bloque_nombre]);
    if (bloques.length > 0) {
      bloque_id = bloques[0].id;
    } else {
      const [b] = await db.query('INSERT INTO bloques (nombre) VALUES (?)', [bloque_nombre]);
      bloque_id = b.insertId;
    }

    let salon_id;
    const [salones] = await db.query(
      'SELECT id FROM salones WHERE bloque_id = ? AND piso = ? AND numero = ?',
      [bloque_id, piso_num, salon_num]);
    if (salones.length > 0) {
      salon_id = salones[0].id;
    } else {
      const [s] = await db.query(
        'INSERT INTO salones (bloque_id, piso, numero, nombre_completo) VALUES (?,?,?,?)',
        [bloque_id, piso_num, salon_num, nombre_completo]);
      salon_id = s.insertId;
    }

    const [result] = await db.query(
      'INSERT INTO horarios (profesor_id, salon_id, materia, dia_semana, hora_inicio, hora_fin) VALUES (?,?,?,?,?,?)',
      [profesor_id, salon_id, materia, dia_semana, hora_inicio, hora_fin]);

    res.json({ success: true, id: result.insertId, salon: nombre_completo });
  } catch (err) {
    res.status(500).json({ error: 'Error al otorgar horario' });
  }
});

// Crear admin (solo con setup_key)
router.post('/setup', async (req, res) => {
  const { nombre, correo, password, setup_key } = req.body;
  if (setup_key !== process.env.JWT_SECRET)
    return res.status(403).json({ error: 'Clave incorrecta' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      'INSERT INTO admins (nombre, correo, password_hash) VALUES (?,?,?)',
      [nombre, correo, hash]);
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'Correo ya registrado' });
    res.status(500).json({ error: 'Error al crear admin' });
  }
});

module.exports = router;
