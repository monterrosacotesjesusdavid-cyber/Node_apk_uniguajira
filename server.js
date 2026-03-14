const express     = require('express');
const cors        = require('cors');
const crearTablas = require('./setup');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rutas
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/estudiante', require('./routes/estudiante'));
app.use('/api/profesor',   require('./routes/profesor'));
app.use('/api/admin',      require('./routes/admin'));

// Health check
app.get('/', (req, res) => res.json({ ok: true, msg: 'UniGuajira API funcionando' }));

const PORT = process.env.PORT || 3000;

// Al arrancar crea las tablas automáticamente si no existen
app.listen(PORT, async () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  try {
    await crearTablas();
  } catch (err) {
    console.error('Error creando tablas:', err.message, err.code, err.sqlMessage);
  }
});
