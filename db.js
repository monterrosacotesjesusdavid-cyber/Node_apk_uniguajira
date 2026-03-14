const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.MYSQLHOST          || process.env.DB_HOST     || 'localhost',
  port:     process.env.MYSQLPORT          || process.env.DB_PORT     || 3306,
  user:     process.env.MYSQLUSER          || process.env.DB_USER     || 'root',
  password: process.env.MYSQL_ROOT_PASSWORD|| process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQL_DATABASE     || process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
