/**
 * SEED INTELIGENTE — Uniguajira Asistencia
 * Solo inserta lo que NO existe en la DB. Nunca borra nada.
 */

const bcrypt = require('bcryptjs');
const db     = require('./db');

async function runSeed() {
  try {
    console.log('🌱 Seed: verificando datos...');

    // ── ADMIN ────────────────────────────────────────────────
    const [[{ totalAdmin }]] = await db.query('SELECT COUNT(*) AS totalAdmin FROM admins WHERE correo = ?', ['admin@uniguajira.edu.co']);
    if (totalAdmin === 0) {
      const adminHash = await bcrypt.hash('Admin2024*', 10);
      await db.query(
        'INSERT INTO admins (nombre, correo, password_hash) VALUES (?,?,?)',
        ['Administrador Principal', 'admin@uniguajira.edu.co', adminHash]
      );
      console.log('✅ Admin creado');
    }

    // ── PROFESORES ───────────────────────────────────────────
    const profHash = await bcrypt.hash('Profe1234*', 10);
    const profesores = [
      ['Carlos Alberto Pérez',   'cperez@uniguajira.edu.co',   '1001234567'],
      ['Laura Sofía Gómez',      'lgomez@uniguajira.edu.co',    '1007654321'],
      ['Andrés Felipe Martínez', 'amartinez@uniguajira.edu.co', '1009876543'],
    ];
    for (const [nombre, correo, cedula] of profesores) {
      const [[{ existe }]] = await db.query('SELECT COUNT(*) AS existe FROM profesores WHERE cedula = ?', [cedula]);
      if (existe === 0) {
        await db.query(
          'INSERT INTO profesores (nombre, correo, cedula, password_hash) VALUES (?,?,?,?)',
          [nombre, correo, cedula, profHash]
        );
        console.log(`✅ Profesor creado: ${nombre}`);
      }
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
      const [[{ existe }]] = await db.query('SELECT COUNT(*) AS existe FROM estudiantes WHERE username = ?', [username]);
      if (existe === 0) {
        const codigoHash = await bcrypt.hash(codigo, 10);
        await db.query(
          'INSERT INTO estudiantes (nombre, username, codigo_hash) VALUES (?,?,?)',
          [nombre, username, codigoHash]
        );
        console.log(`✅ Estudiante creado: ${username}`);
      }
    }

    // ── BLOQUES ──────────────────────────────────────────────
    const bloquesDef = [
      ['Bloque 6', 'Bloque Principal'],
      ['Bloque 3', 'Bloque de Ingeniería'],
      ['Bloque 2', 'Bloque de Ciencias'],
    ];
    const bloqueIds = {};
    for (const [nombre, descripcion] of bloquesDef) {
      const [rows] = await db.query('SELECT id FROM bloques WHERE nombre = ?', [nombre]);
      if (rows.length > 0) {
        bloqueIds[nombre] = rows[0].id;
      } else {
        const [r] = await db.query('INSERT INTO bloques (nombre, descripcion) VALUES (?,?)', [nombre, descripcion]);
        bloqueIds[nombre] = r.insertId;
        console.log(`✅ Bloque creado: ${nombre}`);
      }
    }

    // ── SALONES ──────────────────────────────────────────────
    const salonesDef = [
      ['Bloque 6', 1, '03', 'Bloque 6 - Piso 1 - Salón 03'],
      ['Bloque 6', 1, '04', 'Bloque 6 - Piso 1 - Salón 04'],
      ['Bloque 3', 1, '01', 'Bloque 3 - Piso 1 - Salón 01'],
      ['Bloque 3', 2, '02', 'Bloque 3 - Piso 2 - Salón 02'],
      ['Bloque 2', 1, '01', 'Bloque 2 - Piso 1 - Salón 01'],
      ['Bloque 2', 2, '01', 'Bloque 2 - Piso 2 - Salón 01'],
    ];
    const salonIds = {};
    for (const [bloque, piso, numero, nombre_completo] of salonesDef) {
      const [rows] = await db.query(
        'SELECT id FROM salones WHERE bloque_id = ? AND piso = ? AND numero = ?',
        [bloqueIds[bloque], piso, numero]
      );
      if (rows.length > 0) {
        salonIds[nombre_completo] = rows[0].id;
      } else {
        const [r] = await db.query(
          'INSERT INTO salones (bloque_id, piso, numero, nombre_completo) VALUES (?,?,?,?)',
          [bloqueIds[bloque], piso, numero, nombre_completo]
        );
        salonIds[nombre_completo] = r.insertId;
        console.log(`✅ Salón creado: ${nombre_completo}`);
      }
    }

    // ── HORARIOS ─────────────────────────────────────────────
    const [profs] = await db.query('SELECT id, cedula FROM profesores ORDER BY id');
    const profPorCedula = {};
    for (const p of profs) profPorCedula[p.cedula] = p.id;

    const horariosDef = [
      // Carlos Pérez
      ['1001234567', 'Bloque 6 - Piso 1 - Salón 03', 'Cálculo Diferencial',       'Lunes',     '07:00:00', '09:00:00'],
      ['1001234567', 'Bloque 6 - Piso 1 - Salón 04', 'Cálculo Diferencial',       'Miércoles', '07:00:00', '09:00:00'],
      ['1001234567', 'Bloque 6 - Piso 1 - Salón 03', 'Física Mecánica',           'Viernes',   '07:00:00', '09:00:00'],
      ['1001234567', 'Bloque 6 - Piso 1 - Salón 03', 'Introducción a Ingeniería', 'Sábado',    '07:00:00', '09:00:00'],
      ['1001234567', 'Bloque 6 - Piso 1 - Salón 04', 'Introducción a Ingeniería', 'Sábado',    '09:00:00', '11:00:00'],
      // Laura Gómez
      ['1007654321', 'Bloque 3 - Piso 1 - Salón 01', 'Programación I',            'Martes',    '09:00:00', '11:00:00'],
      ['1007654321', 'Bloque 3 - Piso 2 - Salón 02', 'Programación I',            'Jueves',    '09:00:00', '11:00:00'],
      ['1007654321', 'Bloque 3 - Piso 1 - Salón 01', 'Estructuras de Datos',      'Miércoles', '14:00:00', '16:00:00'],
      ['1007654321', 'Bloque 3 - Piso 2 - Salón 02', 'Estructuras de Datos',      'Sábado',    '07:00:00', '09:00:00'],
      // Andrés Martínez
      ['1009876543', 'Bloque 2 - Piso 1 - Salón 01', 'Álgebra Lineal',            'Lunes',     '11:00:00', '13:00:00'],
      ['1009876543', 'Bloque 2 - Piso 2 - Salón 01', 'Álgebra Lineal',            'Viernes',   '11:00:00', '13:00:00'],
      ['1009876543', 'Bloque 2 - Piso 1 - Salón 01', 'Estadística Descriptiva',   'Martes',    '14:00:00', '16:00:00'],
      ['1009876543', 'Bloque 2 - Piso 2 - Salón 01', 'Estadística Descriptiva',   'Sábado',    '07:00:00', '09:00:00'],
    ];

    for (const [cedula, salon, materia, dia, inicio, fin] of horariosDef) {
      const profId   = profPorCedula[cedula];
      const salonId  = salonIds[salon];
      if (!profId || !salonId) continue;

      const [rows] = await db.query(
        'SELECT id FROM horarios WHERE profesor_id = ? AND materia = ? AND dia_semana = ? AND hora_inicio = ?',
        [profId, materia, dia, inicio]
      );
      if (rows.length === 0) {
        await db.query(
          'INSERT INTO horarios (profesor_id, salon_id, materia, dia_semana, hora_inicio, hora_fin) VALUES (?,?,?,?,?,?)',
          [profId, salonId, materia, dia, inicio, fin]
        );
        console.log(`✅ Horario creado: ${materia} - ${dia} ${inicio}`);
      }
    }

    // ── MATRICULAR ESTUDIANTES EN HORARIOS ───────────────────
    const [ests]     = await db.query('SELECT id FROM estudiantes ORDER BY id');
    const [horarios] = await db.query('SELECT id FROM horarios ORDER BY id');
    for (let i = 0; i < ests.length; i++) {
      for (let j = 0; j < 3; j++) {
        const hId = horarios[(i + j) % horarios.length].id;
        await db.query(
          'INSERT IGNORE INTO estudiante_horarios (estudiante_id, horario_id) VALUES (?,?)',
          [ests[i].id, hId]
        );
      }
    }

    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║      ✅  SEED COMPLETADO                             ║');
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
