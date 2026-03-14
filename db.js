const mysql = require('mysql2/promise');
require('dotenv').config();

const host     = process.env.MYSQLHOST            || process.env.DB_HOST     || 'localhost';
const port     = process.env.MYSQLPORT            || process.env.DB_PORT     || 3306;
const user     = process.env.MYSQLUSER            || process.env.DB_USER     || 'root';
const password = process.env.MYSQL_ROOT_PASSWORD  || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
const database = process.env.MYSQL_DATABASE       || process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway';

console.log('DB host:', host, 'port:', port, 'db:', database, 'user:', user);

const pool = mysql.createPool({
  host, port, user, password, database,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
