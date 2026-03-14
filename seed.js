/**
 * SEED DE DATOS DE PRUEBA — Uniguajira Asistencia
 * Se ejecuta automáticamente al arrancar el servidor.
 * Si ya hay datos, no hace nada.
 *
 * ╔══════════════════════════════════════════════════════╗
 *  CREDENCIALES CREADAS:
 *
 *  ADMIN
 *    Correo  : admin@uniguajira.edu.co
 *    Password: Admin2024*
 *
 *  PROFESORES  (login: cédula + password)
 *    Carlos Pérez     | cédula: 1001234567 | Profe1234*
 *    Laura Gómez      | cédula: 1007654321 | Profe1234*
 *    Andrés Martínez  | cédula: 1009876543 | Profe1234*
 *
 *  ESTUDIANTES  (login: username + código)
 *    jperez     / Est00001
 *    mgomez     / Est00002
 *    arojas     / Est00003
 *    lmartinez  / Est00004
 *    dherrera   / Est00005
 *    klopez     / Est00006
 *    fcastro    / Est00007
 *    ndiaz      / Est00008
 *    jmorales   / Est00009
 *    cvargas    / Est00010
 * ╚══════════════════════════════════════════════════════╝
 */

const bcrypt = require('bcryptjs');
const db     = require('./db');

async function runSeed() {
  try {
    // Si ya hay un admin, omitir todo
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM admins');
    if (total > 0) {
      console.log('ℹ️  Seed: datos ya existen, omitiendo...');
      return;
    }

    console.log('🌱 Seed: insertando datos de prueba...');

    // ── ADMIN ────────────────────────────────────────────────
    const adminHash = await bcrypt.hash('Admin2024*', 10);
    await db.query(
      'INSERT INTO admins (nombre, correo, password_hash) VALUES (?,?,?)',
      ['Administrador Principal', 'admin@uniguajira.edu.co', adminHash]
    );

    // ── PROFESORES ───────────────────────────────────────────
    const profHash = await bcrypt.hash('Profe1234*', 10);
    const profesores = [
      ['Carlos Alberto Pérez',   'cperez@uniguajira.edu.co',   '1001234567'],
      ['Laura Sofía Gómez',      'lgomez@uniguajira.edu.co',    '1007654321'],
      ['Andrés Felipe Martínez', 'amartinez@uniguajira.edu.co', '1009876543'],
    ];
    for (const [nombre, correo, cedula] of profesores) {
      await db.query(
        'INSERT INTO profesores (nombre, correo, cedula, password_hash) VALUES (?,?,?,?)',
        [nombre, correo, cedula, profHash]
      );
    }

    // ── ESTUDIANTES ──────────────────────────────────────────
    const estudiantes = [
      ['Juan David Pérez',        'jperez',    'Est00001'],
      ['María Camila Gómez',      'mgomez',    'Est00002'],
      ['Alejandro Rojas',         'arojas',    'Est00003'],
      ['Luisa Fernanda Martínez', 'lmartinez', 'Est00004'],
      ['Diego Armando Herrera',   'dherrera',  'Est00005'],
      ['Karen Paola López',       'klopez',    'Est00006'],
      ['Felipe Andrés Castro',    'fcastro',   'Est00007'],
      ['Natalia Díaz',            'ndiaz',     'Est00008'],
      ['Jorge Luis Morales',      'jmorales',  'Est00009'],
      ['Carolina Vargas',         'cvargas',   'Est00010'],
    ];
    for (const [nombre, username, codigo] of estudiantes) {
      const codigoHash = await bcrypt.hash(codigo, 10);
      await db.query(
        'INSERT INTO estudiantes (nombre, username, codigo_hash) VALUES (?,?,?)',
        [nombre, username, codigoHash]
      );
    }

    // ── BLOQUES ──────────────────────────────────────────────
    const bloquesDef = [
      ['Bloque 6', 'Bloque Principal'],
      ['Bloque 3', 'Bloque de Ingeniería'],
      ['Bloque 2', 'Bloque de Ciencias'],
    ];
    const bloqueIds = [];
    for (const [nombre, descripcion] of bloquesDef) {
      const [r] = await db.query(
        'INSERT INTO bloques (nombre, descripcion) VALUES (?,?)',
        [nombre, descripcion]
      );
      bloqueIds.push(r.insertId);
    }

    // ── SALONES ──────────────────────────────────────────────
    const salonesDef = [
      [bloqueIds[0], 1, '03', 'Bloque 6 - Piso 1 - Salón 03'],
      [bloqueIds[0], 1, '04', 'Bloque 6 - Piso 1 - Salón 04'],
      [bloqueIds[1], 1, '01', 'Bloque 3 - Piso 1 - Salón 01'],
      [bloqueIds[1], 2, '02', 'Bloque 3 - Piso 2 - Salón 02'],
      [bloqueIds[2], 1, '01', 'Bloque 2 - Piso 1 - Salón 01'],
      [bloqueIds[2], 2, '01', 'Bloque 2 - Piso 2 - Salón 01'],
    ];
    const salonIds = [];
    for (const [bloque_id, piso, numero, nombre_completo] of salonesDef) {
      const [r] = await db.query(
        'INSERT INTO salones (bloque_id, piso, numero, nombre_completo) VALUES (?,?,?,?)',
        [bloque_id, piso, numero, nombre_completo]
      );
      salonIds.push(r.insertId);
    }

    // ── HORARIOS ─────────────────────────────────────────────
    const [profs] = await db.query('SELECT id FROM profesores ORDER BY id');
    const horariosDef = [
      [profs[0].id, salonIds[0], 'Cálculo Diferencial',     'Lunes',     '07:00:00', '09:00:00'],
      [profs[0].id, salonIds[1], 'Cálculo Diferencial',     'Miércoles', '07:00:00', '09:00:00'],
      [profs[0].id, salonIds[0], 'Física Mecánica',         'Viernes',   '07:00:00', '09:00:00'],
      [profs[1].id, salonIds[2], 'Programación I',          'Martes',    '09:00:00', '11:00:00'],
      [profs[1].id, salonIds[3], 'Programación I',          'Jueves',    '09:00:00', '11:00:00'],
      [profs[1].id, salonIds[2], 'Estructuras de Datos',    'Miércoles', '14:00:00', '16:00:00'],
      [profs[2].id, salonIds[4], 'Álgebra Lineal',          'Lunes',     '11:00:00', '13:00:00'],
      [profs[2].id, salonIds[5], 'Álgebra Lineal',          'Viernes',   '11:00:00', '13:00:00'],
      [profs[2].id, salonIds[4], 'Estadística Descriptiva', 'Martes',    '14:00:00', '16:00:00'],
    ];
    const horarioIds = [];
    for (const [profesor_id, salon_id, materia, dia_semana, hora_inicio, hora_fin] of horariosDef) {
      const [r] = await db.query(
        'INSERT INTO horarios (profesor_id, salon_id, materia, dia_semana, hora_inicio, hora_fin) VALUES (?,?,?,?,?,?)',
        [profesor_id, salon_id, materia, dia_semana, hora_inicio, hora_fin]
      );
      horarioIds.push(r.insertId);
    }

    // ── MATRICULAR ESTUDIANTES EN HORARIOS ───────────────────
    const [ests] = await db.query('SELECT id FROM estudiantes ORDER BY id');
    for (let i = 0; i < ests.length; i++) {
      for (let j = 0; j < 3; j++) {
        const hId = horarioIds[(i + j) % horarioIds.length];
        await db.query(
          'INSERT IGNORE INTO estudiante_horarios (estudiante_id, horario_id) VALUES (?,?)',
          [ests[i].id, hId]
        );
      }
    }

    // ── ASISTENCIAS DE PRUEBA (últimos 7 días) ───────────────
    const LAT = 11.5449, LNG = -72.9072; // Campus Uniguajira - Riohacha
    const estadosProf = ['a_tiempo', 'a_tiempo', 'tardanza', 'a_tiempo', 'ausente', 'a_tiempo', 'tardanza'];

    for (let d = 1; d <= 7; d++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - d);
      const fechaStr = fecha.toISOString().split('T')[0];

      for (let pi = 0; pi < profs.length; pi++) {
        const hId    = horarioIds[pi * 3] || horarioIds[0];
        const estado = estadosProf[(d + pi) % estadosProf.length];
        const mins   = estado === 'tardanza' ? (d * 2 + pi + 1) % 15 + 1 : 0;
        const hora   = `${fechaStr} 07:${String(mins).padStart(2, '0')}:00`;

        await db.query(
          `INSERT IGNORE INTO asistencias
             (profesor_id, horario_id, fecha, hora_registro,
              latitud, longitud, distancia_campus, estado, minutos_tarde, ip_registro)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [
            profs[pi].id, hId, fechaStr, hora,
            LAT + (d * 0.0001), LNG + (pi * 0.0001),
            Math.floor(Math.random() * 80),
            estado, mins, `192.168.1.${10 + pi}`
          ]
        );
      }
    }

    // ── ASISTENCIAS ESTUDIANTES (últimos 5 días) ─────────────
    for (let d = 1; d <= 5; d++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - d);
      const fechaStr = fecha.toISOString().split('T')[0];
      const estadoEst = d === 3 ? 'ausente' : d === 5 ? 'tardanza' : 'presente';

      for (let ei = 0; ei < ests.length; ei++) {
        const hId = horarioIds[ei % horarioIds.length];
        await db.query(
          `INSERT IGNORE INTO asistencias_estudiantes
             (estudiante_id, horario_id, fecha, hora_registro, latitud, longitud, estado)
           VALUES (?,?,?,?,?,?,?)`,
          [
            ests[ei].id, hId, fechaStr,
            `${fechaStr} 07:05:00`,
            LAT + (ei * 0.0001), LNG + (d * 0.0001),
            estadoEst
          ]
        );
      }
    }

    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║      ✅  DATOS DE PRUEBA CREADOS EXITOSAMENTE        ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  ADMIN                                               ║');
    console.log('║    correo  : admin@uniguajira.edu.co                 ║');
    console.log('║    password: Admin2024*                              ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  PROFESORES  (cédula + password)                     ║');
    console.log('║    Carlos Pérez     | 1001234567 | Profe1234*        ║');
    console.log('║    Laura Gómez      | 1007654321 | Profe1234*        ║');
    console.log('║    Andrés Martínez  | 1009876543 | Profe1234*        ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log('║  ESTUDIANTES  (username + código)                    ║');
    console.log('║    jperez    / Est00001   mgomez    / Est00002       ║');
    console.log('║    arojas    / Est00003   lmartinez / Est00004       ║');
    console.log('║    dherrera  / Est00005   klopez    / Est00006       ║');
    console.log('║    fcastro   / Est00007   ndiaz     / Est00008       ║');
    console.log('║    jmorales  / Est00009   cvargas   / Est00010       ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  }
}

module.exports = runSeed;
