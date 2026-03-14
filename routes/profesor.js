const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { verificarToken, soloProfesor } = require('../middleware/auth');

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// ── Hora Colombia usando Intl (funciona 100% en Railway) ─────
function ahoraColombia() {
  const ahora = new Date();

  // Sacar hora Colombia con Intl.DateTimeFormat
  const partes = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour:     'numeric',
    minute:   'numeric',
    weekday:  'long',
    hour12:   false,
  }).formatToParts(ahora);

  const get = (tipo) => partes.find(p => p.type === tipo)?.value ?? '';

  const hora    = parseInt(get('hour'));
  const minuto  = parseInt(get('minute'));
  const weekday = get('weekday'); // "lunes", "martes", etc. en español

  // Capitalizar primera letra para coincidir con la DB
  const diaCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  // Día especial: miércoles
  const diaFinal = diaCap.normalize('NFD').replace(/\u0301/g, '') === 'Miercoles'
    ? 'Miércoles' : diaCap;

  return { hora, minuto, dia: diaFinal, minTotal: hora * 60 + minuto };
}

function distancia(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) *
            Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Clases del profesor hoy
router.get('/clases-hoy', verificarToken, soloProfesor, async (req, res) => {
  try {
    const { hora, minuto, dia, minTotal } = ahoraColombia();
    console.log(`⏰ Hora Colombia: ${hora}:${minuto} — Día: ${dia}`);

    const [clases] = await db.query(`
      SELECT h.id, h.materia, h.dia_semana, h.hora_inicio, h.hora_fin,
             s.nombre_completo AS salon, b.nombre AS bloque,
             a.estado AS asistencia_estado, a.hora_registro
      FROM horarios h
      JOIN salones s ON h.salon_id = s.id
      JOIN bloques b ON s.bloque_id = b.id
      LEFT JOIN asistencias a
        ON a.horario_id = h.id AND a.profesor_id = ? AND a.fecha = CURDATE()
      WHERE h.profesor_id = ? AND h.dia_semana = ? AND h.activo = TRUE
      ORDER BY h.hora_inicio
    `, [req.usuario.id, req.usuario.id, dia]);

    const resultado = clases.map(c => {
      const [hI, mI] = c.hora_inicio.split(':').map(Number);
      const inicioMin = hI * 60 + mI;
      const diff = minTotal - inicioMin;
      let disponible = false;
      let mensaje = '';

      if (c.asistencia_estado) {
        mensaje = 'Ya registrado';
      } else if (diff < -10) {
        mensaje = `Disponible en ${Math.abs(diff) - 10} min`;
      } else if (diff >= -10 && diff <= 40) {
        disponible = true;
        mensaje = diff <= 0 ? 'A tiempo' : `Tardanza (${diff} min)`;
      } else {
        mensaje = 'Tiempo expirado — Ausente';
      }

      return { ...c, disponible, mensaje };
    });

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clases' });
  }
});

// Horario semanal completo
router.get('/horario-semana', verificarToken, soloProfesor, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT h.id, h.materia, h.dia_semana, h.hora_inicio, h.hora_fin,
             s.nombre_completo AS salon, b.nombre AS bloque
      FROM horarios h
      JOIN salones s ON h.salon_id = s.id
      JOIN bloques b ON s.bloque_id = b.id
      WHERE h.profesor_id = ? AND h.activo = TRUE
      ORDER BY FIELD(h.dia_semana,'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'), h.hora_inicio
    `, [req.usuario.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener horario' });
  }
});

// Registrar asistencia profesor (con foto y GPS)
router.post('/registrar-asistencia', verificarToken, soloProfesor, async (req, res) => {
  const { horario_id, latitud, longitud, foto_base64 } = req.body;
  if (!horario_id || !latitud || !longitud || !foto_base64)
    return res.status(400).json({ error: 'Datos incompletos' });

  try {
    const campusLat = parseFloat(process.env.CAMPUS_LAT);
    const campusLon = parseFloat(process.env.CAMPUS_LON);
    const radio     = parseFloat(process.env.CAMPUS_RADIO);
    const dist      = distancia(latitud, longitud, campusLat, campusLon);

    if (dist > radio)
      return res.status(403).json({
        error: `Estás a ${Math.round(dist)}m del campus. Debes estar dentro para registrar.`
      });

    const [horarios] = await db.query(
      'SELECT * FROM horarios WHERE id = ? AND profesor_id = ? AND activo = TRUE',
      [horario_id, req.usuario.id]);
    if (horarios.length === 0)
      return res.status(404).json({ error: 'Horario no encontrado' });

    const { minTotal } = ahoraColombia();
    const [hI, mI]    = horarios[0].hora_inicio.split(':').map(Number);
    const inicioMin   = hI * 60 + mI;
    const diff        = minTotal - inicioMin;

    if (diff < -10) return res.status(400).json({ error: 'La clase aún no está disponible' });
    if (diff > 40)  return res.status(400).json({ error: 'El tiempo para registrar ha expirado' });

    const estado        = diff <= 0 ? 'a_tiempo' : 'tardanza';
    const minutos_tarde = diff > 0 ? diff : 0;

    await db.query(`
      INSERT INTO asistencias
        (profesor_id, horario_id, fecha, hora_registro, latitud, longitud,
         distancia_campus, foto_base64, estado, minutos_tarde, ip_registro)
      VALUES (?, ?, CURDATE(), NOW(), ?, ?, ?, ?, ?, ?, ?)
    `, [req.usuario.id, horario_id, latitud, longitud,
        Math.round(dist), foto_base64, estado, minutos_tarde,
        req.headers['x-forwarded-for'] || req.socket.remoteAddress]);

    res.json({ success: true, estado, minutos_tarde, distancia: Math.round(dist) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'Ya registraste asistencia para esta clase hoy' });
    console.error(err);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
});

module.exports = router;
