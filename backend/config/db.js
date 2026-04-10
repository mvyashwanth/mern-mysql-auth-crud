// config/db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mern_auth_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL Connection Error:', err.message);
    console.error('👉 Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in your .env file');
    return;
  }
  console.log('✅ MySQL Connected Successfully');
  connection.release();
});

module.exports = promisePool;
