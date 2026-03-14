const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { verificarToken, soloEstudiante } = require('../middleware/auth');

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function distancia(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) *
            Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Clases del estudiante hoy
router.get('/clases', verificarToken, soloEstudiante, async (req, res) => {
  try {
    const ahora   = new Date();
    const diaHoy  = DIAS[ahora.getDay()];
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();

    const [clases] = await db.query(`
      SELECT h.id, h.materia, h.hora_inicio, h.hora_fin,
             p.nombre AS profesor_nombre,
             s.nombre_completo AS salon,
             a.estado AS ya_firmo_estado,
             a.hora_registro
      FROM estudiante_horarios eh
      JOIN horarios h ON eh.horario_id = h.id
      JOIN profesores p ON h.profesor_id = p.id
      JOIN salones s ON h.salon_id = s.id
      LEFT JOIN asistencias_estudiantes a
        ON a.horario_id = h.id AND a.estudiante_id = ? AND a.fecha = CURDATE()
      WHERE eh.estudiante_id = ? AND h.dia_semana = ? AND h.activo = TRUE
      ORDER BY h.hora_inicio
    `, [req.usuario.id, req.usuario.id, diaHoy]);

    const resultado = clases.map(c => {
      const [hI, mI] = c.hora_inicio.split(':').map(Number);
      const inicioMin = hI * 60 + mI;
      const diff = ahoraMin - inicioMin;
      const yaFirmo = !!c.ya_firmo_estado;
      let disponible = false;
      let mensaje = '';

      if (yaFirmo) {
        mensaje = 'Ya firmado';
      } else if (diff < -10) {
        mensaje = `Disponible en ${Math.abs(diff) - 10} min`;
      } else if (diff >= -10 && diff <= 40) {
        disponible = true;
        mensaje = diff <= 0 ? 'A tiempo' : `Tardanza (${diff} min)`;
      } else {
        mensaje = 'Tiempo expirado';
      }

      return { ...c, ya_firmo: yaFirmo, disponible, mensaje };
    });

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clases' });
  }
});

// Asistencias del estudiante en una clase
router.get('/asistencias/:horarioId', verificarToken, soloEstudiante, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT fecha, hora_registro, estado
      FROM asistencias_estudiantes
      WHERE estudiante_id = ? AND horario_id = ?
      ORDER BY fecha DESC
    `, [req.usuario.id, req.params.horarioId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// Firmar asistencia (estudiante)
router.post('/firmar', verificarToken, soloEstudiante, async (req, res) => {
  const { horario_id, latitud, longitud } = req.body;
  if (!horario_id || !latitud || !longitud)
    return res.status(400).json({ error: 'Datos incompletos' });

  try {
    // Validar que el estudiante pertenece a esa clase
    const [check] = await db.query(
      'SELECT * FROM estudiante_horarios WHERE estudiante_id = ? AND horario_id = ?',
      [req.usuario.id, horario_id]);
    if (check.length === 0)
      return res.status(403).json({ error: 'No perteneces a esta clase' });

    // Validar GPS campus
    const campusLat = parseFloat(process.env.CAMPUS_LAT);
    const campusLon = parseFloat(process.env.CAMPUS_LON);
    const radio     = parseFloat(process.env.CAMPUS_RADIO);
    const dist      = distancia(latitud, longitud, campusLat, campusLon);
    if (dist > radio)
      return res.status(403).json({
        error: `Estás a ${Math.round(dist)}m del campus. Debes estar dentro para firmar.`
      });

    // Validar ventana de tiempo
    const [horarios] = await db.query(
      'SELECT * FROM horarios WHERE id = ? AND activo = TRUE', [horario_id]);
    if (horarios.length === 0)
      return res.status(404).json({ error: 'Clase no encontrada' });

    const ahora = new Date();
    const [hI, mI] = horarios[0].hora_inicio.split(':').map(Number);
    const inicioMin = hI * 60 + mI;
    const ahoraMin  = ahora.getHours() * 60 + ahora.getMinutes();
    const diff      = ahoraMin - inicioMin;

    if (diff < -10) return res.status(400).json({ error: 'La clase aún no está disponible' });
    if (diff > 40)  return res.status(400).json({ error: 'El tiempo para firmar ha expirado' });

    const estado = diff <= 0 ? 'presente' : 'tardanza';

    await db.query(`
      INSERT INTO asistencias_estudiantes
        (estudiante_id, horario_id, fecha, hora_registro, latitud, longitud, estado)
      VALUES (?, ?, CURDATE(), NOW(), ?, ?, ?)
    `, [req.usuario.id, horario_id, latitud, longitud, estado]);

    res.json({ success: true, estado });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'Ya firmaste asistencia para esta clase hoy' });
    console.error(err);
    res.status(500).json({ error: 'Error al firmar asistencia' });
  }
});

module.exports = router;
