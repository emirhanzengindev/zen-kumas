const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // varsa MySQL şifreni yaz
  database: 'zenkumas'
});

db.connect((err) => {
  if (err) throw err;
  console.log(' MySQL bağlantisi başarili');
});

module.exports = db;
