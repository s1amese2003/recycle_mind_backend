const mysql = require('mysql2/promise');

// 创建数据库连接池
const pool = mysql.createPool({
  host: '39.106.228.80',
  user: 'root',
  password: 'Test@114514',
  database: 'recycle_mind',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 导出连接池
module.exports = pool; 