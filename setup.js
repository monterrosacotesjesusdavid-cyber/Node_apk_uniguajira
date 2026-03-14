const db = require('./db');

async function crearTablas() {
  console.log('Creando tablas...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      correo VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS profesores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      correo VARCHAR(150) NOT NULL UNIQUE,
      cedula VARCHAR(20) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      activo BOOLEAN DEFAULT TRUE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS estudiantes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      username VARCHAR(50) NOT NULL UNIQUE,
      codigo_hash VARCHAR(255) NOT NULL,
      activo BOOLEAN DEFAULT TRUE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS bloques (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(50) NOT NULL,
      descripcion VARCHAR(150)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS salones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bloque_id INT NOT NULL,
      piso INT NOT NULL,
      numero VARCHAR(10) NOT NULL,
      nombre_completo VARCHAR(100) NOT NULL,
      FOREIGN KEY (bloque_id) REFERENCES bloques(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS horarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      profesor_id INT NOT NULL,
      salon_id INT NOT NULL,
      materia VARCHAR(100) NOT NULL,
      dia_semana ENUM('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado') NOT NULL,
      hora_inicio TIME NOT NULL,
      hora_fin TIME NOT NULL,
      activo BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE,
      FOREIGN KEY (salon_id) REFERENCES salones(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS estudiante_horarios (
      estudiante_id INT NOT NULL,
      horario_id INT NOT NULL,
      PRIMARY KEY (estudiante_id, horario_id),
      FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
      FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS asistencias (
      id INT AUTO_INCREMENT PRIMARY KEY,
      profesor_id INT NOT NULL,
      horario_id INT NOT NULL,
      fecha DATE NOT NULL,
      hora_registro DATETIME NOT NULL,
      latitud DECIMAL(10,8) NOT NULL,
      longitud DECIMAL(11,8) NOT NULL,
      distancia_campus DECIMAL(8,2),
      foto_base64 LONGTEXT,
      estado ENUM('a_tiempo','tardanza','ausente') NOT NULL,
      minutos_tarde INT DEFAULT 0,
      ip_registro VARCHAR(45),
      FOREIGN KEY (profesor_id) REFERENCES profesores(id),
      FOREIGN KEY (horario_id) REFERENCES horarios(id),
      UNIQUE KEY una_por_dia (profesor_id, horario_id, fecha)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS asistencias_estudiantes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      estudiante_id INT NOT NULL,
      horario_id INT NOT NULL,
      fecha DATE NOT NULL,
      hora_registro DATETIME NOT NULL,
      latitud DECIMAL(10,8),
      longitud DECIMAL(11,8),
      estado ENUM('presente','tardanza','ausente') NOT NULL,
      FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
      FOREIGN KEY (horario_id) REFERENCES horarios(id),
      UNIQUE KEY una_por_dia (estudiante_id, horario_id, fecha)
    )
  `);

  console.log('✅ Todas las tablas creadas correctamente');
}

module.exports = crearTablas;
