// 引入依赖
const express = require('express');
const cors = require('cors');
const db = require('./db'); // 引入数据库连接池

// 创建 Express 应用
const app = express();
const port = 3000; // 你可以指定任何未被占用的端口

// --- 中间件配置 ---
// 1. 使用 cors 中间件解决跨域问题
app.use(cors()); 

// 2. 使用 express.json() 中间件来解析请求体中的 JSON 数据
app.use(express.json());

// --- API 路由定义 ---

// --- 用户认证 API ---
/**
 * 登录接口
 * POST /api/user/login
 */
app.post('/api/user/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('登录请求(明文模式):', { username });
  if (!username || !password) {
    return res.status(400).json({ code: 40001, message: '用户名和密码不能为空。' });
  }
  try {
    const [users] = await db.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    if (users.length > 0) {
      const user = users[0];
      if (!user.is_active) {
        return res.status(403).json({ code: 50012, message: '该账户已被禁用，请联系管理员。' });
      }
      res.json({
        code: 20000,
        data: { token: `mock-${user.username}-token` }
      });
    } else {
      res.status(401).json({ code: 50008, message: '用户名或密码错误。' });
    }
  } catch (error) {
    console.error('登录 API 查询数据库时出错:', error);
    res.status(500).json({ code: 50000, message: '服务器内部错误，请稍后重试。' });
  }
});

/**
 * 获取用户信息的接口
 * GET /api/user/info
 */
app.get('/api/user/info', async (req, res) => {
  const token = req.headers['x-token'];
  console.log('接收到获取用户信息的请求，token:', token);
  if (token && token.startsWith('mock-') && token.endsWith('-token')) {
    const username = token.substring(5, token.length - 6);
    console.log('从 token 中解析出的用户名:', username);
    try {
      const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
      if (users.length === 0) {
        return res.status(404).json({ code: 50014, message: '用户不存在。' });
      }
      const user = users[0];
      res.json({
        code: 20000,
        data: {
          roles: [user.role],
          introduction: `我是一名 ${user.role}`,
          avatar: 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif',
          name: user.username
        }
      });
    } catch (error) {
      console.error('获取用户信息 API 查询数据库时出错:', error);
      res.status(500).json({ code: 50000, message: '服务器内部错误，请稍后重试。' });
    }
  } else {
    res.status(401).json({ code: 50008, message: '无效的 token' });
  }
});

/**
 * 用户登出接口
 * POST /api/user/logout
 */
app.post('/api/user/logout', (req, res) => {
  console.log('接收到登出请求');
  res.json({ code: 20000, data: 'success' });
});

// --- 废料管理 API ---
/**
 * 获取废料列表
 * GET /api/waste-material/list
 */
app.get('/api/waste-material/list', async (req, res) => {
  console.log('接收到获取废料列表的请求');
  try {
    const [rows] = await db.query('SELECT * FROM waste_materials ORDER BY id ASC');
    const items = rows.map(item => ({
        ...item,
        stock: item.stock_kg
    }));
    res.json({
      code: 20000,
      data: { items: items, total: items.length }
    });
  } catch (error) {
    console.error('获取废料列表 API 查询数据库时出错:', error);
    res.status(500).json({ code: 50000, message: '服务器内部错误，获取废料列表失败。' });
  }
});

/**
 * 新增废料
 * POST /api/waste-material
 */
app.post('/api/waste-material', async (req, res) => {
  const { name, storage_area, composition, stock_kg, unit_price } = req.body;
  console.log('接收到新增废料请求:', { name });
  try {
    const [result] = await db.query(
      'INSERT INTO waste_materials (name, storage_area, composition, stock_kg, unit_price) VALUES (?, ?, ?, ?, ?)',
      [name, storage_area, JSON.stringify(composition), stock_kg, unit_price]
    );
    res.status(201).json({
      code: 20000,
      data: { id: result.insertId, ...req.body }
    });
  } catch (error) {
    console.error('新增废料 API 数据库操作出错:', error);
    res.status(500).json({ code: 50000, message: '服务器内部错误，新增废料失败。' });
  }
});

/**
 * 修改废料
 * PUT /api/waste-material/:id
 */
app.put('/api/waste-material/:id', async (req, res) => {
  const { id } = req.params;
  const { name, storage_area, composition, stock_kg, unit_price } = req.body;
  console.log(`接收到修改废料 ${id} 的请求:`, { name });
  try {
    const [result] = await db.query(
      'UPDATE waste_materials SET name = ?, storage_area = ?, composition = ?, stock_kg = ?, unit_price = ? WHERE id = ?',
      [name, storage_area, JSON.stringify(composition), stock_kg, unit_price, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 40401, message: '未找到指定ID的废料。' });
    }
    res.json({ code: 20000, data: 'success' });
  } catch (error) {
    console.error(`修改废料 ${id} API 数据库操作出错:`, error);
    res.status(500).json({ code: 50000, message: '服务器内部错误，修改废料失败。' });
  }
});

/**
 * 删除废料
 * DELETE /api/waste-material/:id
 */
app.delete('/api/waste-material/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`接收到删除废料 ${id} 的请求`);
  try {
    const [result] = await db.query('DELETE FROM waste_materials WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 40401, message: '未找到指定ID的废料。' });
    }
    res.json({ code: 20000, data: 'success' });
  } catch (error) {
    console.error(`删除废料 ${id} API 数据库操作出错:`, error);
    res.status(500).json({ code: 50000, message: '服务器内部错误，删除废料失败。' });
  }
});


// --- 产品管理 API ---

/*
--  请在您的 MySQL 数据库 'recycle_mind' 中执行以下 SQL 语句来创建 'products' 表：
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    model_number VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    si_min DECIMAL(10, 5) DEFAULT 0.0,
    si_max DECIMAL(10, 5) DEFAULT 0.0,
    fe_min DECIMAL(10, 5) DEFAULT 0.0,
    fe_max DECIMAL(10, 5) DEFAULT 0.0,
    cu_min DECIMAL(10, 5) DEFAULT 0.0,
    cu_max DECIMAL(10, 5) DEFAULT 0.0,
    mn_min DECIMAL(10, 5) DEFAULT 0.0,
    mn_max DECIMAL(10, 5) DEFAULT 0.0,
    mg_min DECIMAL(10, 5) DEFAULT 0.0,
    mg_max DECIMAL(10, 5) DEFAULT 0.0,
    ti_min DECIMAL(10, 5) DEFAULT 0.0,
    ti_max DECIMAL(10, 5) DEFAULT 0.0,
    cr_min DECIMAL(10, 5) DEFAULT 0.0,
    cr_max DECIMAL(10, 5) DEFAULT 0.0,
    zn_min DECIMAL(10, 5) DEFAULT 0.0,
    zn_max DECIMAL(10, 5) DEFAULT 0.0,
    zr_min DECIMAL(10, 5) DEFAULT 0.0,
    zr_max DECIMAL(10, 5) DEFAULT 0.0,
    others_min DECIMAL(10, 5) DEFAULT 0.0,
    others_max DECIMAL(10, 5) DEFAULT 0.0,
    total_others_min DECIMAL(10, 5) DEFAULT 0.0,
    total_others_max DECIMAL(10, 5) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
*/

const mapRowToProduct = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        customer_name: row.customer_name,
        model_number: row.model_number,
        category: row.category,
        Si: { min: row.si_min, max: row.si_max },
        Fe: { min: row.fe_min, max: row.fe_max },
        Cu: { min: row.cu_min, max: row.cu_max },
        Mn: { min: row.mn_min, max: row.mn_max },
        Mg: { min: row.mg_min, max: row.mg_max },
        Ti: { min: row.ti_min, max: row.ti_max },
        Cr: { min: row.cr_min, max: row.cr_max },
        Zn: { min: row.zn_min, max: row.zn_max },
        Zr: { min: row.zr_min, max: row.zr_max },
        others: { min: row.others_min, max: row.others_max },
        total_others: { min: row.total_others_min, max: row.total_others_max },
        created_at: row.created_at,
        updated_at: row.updated_at
    };
};

const mapProductToDbPayload = (product) => {
    const payload = {
        customer_name: product.customer_name,
        model_number: product.model_number,
        category: product.category,
        si_min: product.Si?.min ?? 0.0,
        si_max: product.Si?.max ?? 0.0,
        fe_min: product.Fe?.min ?? 0.0,
        fe_max: product.Fe?.max ?? 0.0,
        cu_min: product.Cu?.min ?? 0.0,
        cu_max: product.Cu?.max ?? 0.0,
        mn_min: product.Mn?.min ?? 0.0,
        mn_max: product.Mn?.max ?? 0.0,
        mg_min: product.Mg?.min ?? 0.0,
        mg_max: product.Mg?.max ?? 0.0,
        ti_min: product.Ti?.min ?? 0.0,
        ti_max: product.Ti?.max ?? 0.0,
        cr_min: product.Cr?.min ?? 0.0,
        cr_max: product.Cr?.max ?? 0.0,
        zn_min: product.Zn?.min ?? 0.0,
        zn_max: product.Zn?.max ?? 0.0,
        zr_min: product.Zr?.min ?? 0.0,
        zr_max: product.Zr?.max ?? 0.0,
        others_min: product.others?.min ?? 0.0,
        others_max: product.others?.max ?? 0.0,
        total_others_min: product.total_others?.min ?? 0.0,
        total_others_max: product.total_others?.max ?? 0.0,
    };
    Object.keys(payload).forEach(key => (payload[key] === undefined || payload[key] === null) && delete payload[key]);
    return payload;
};

/**
 * 获取产品列表
 * GET /api/products
 */
app.get('/api/products', async (req, res) => {
    console.log('接收到获取产品列表的请求');
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY id ASC');
        const items = rows.map(mapRowToProduct);
        res.json({
            code: 20000,
            data: {
                items: items,
                total: items.length
            }
        });
    } catch (error) {
        console.error('获取产品列表 API 查询数据库时出错:', error);
        res.status(500).json({ code: 50000, message: '服务器内部错误，获取产品列表失败。' });
    }
});

/**
 * 新增产品
 * POST /api/products
 */
app.post('/api/products', async (req, res) => {
    const productData = req.body;
    console.log('接收到新增产品请求:', productData);

    if (!productData || !productData.customer_name || !productData.model_number) {
        return res.status(400).json({ code: 40001, message: '客户名称和型号不能为空。' });
    }

    try {
        const payload = mapProductToDbPayload(productData);
        const columns = Object.keys(payload).join(', ');
        const placeholders = Object.keys(payload).map(() => '?').join(', ');
        const values = Object.values(payload);
        const sql = `INSERT INTO products (${columns}) VALUES (${placeholders})`;
        const [result] = await db.query(sql, values);
        const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
        res.status(201).json({
            code: 20000,
            data: mapRowToProduct(newProduct[0])
        });
    } catch (error) {
        console.error('新增产品 API 数据库操作出错:', error);
        res.status(500).json({ code: 50000, message: '服务器内部错误，新增产品失败。' });
    }
});

/**
 * 修改产品
 * PUT /api/products/:id
 */
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const productData = req.body;
    console.log(`接收到修改产品 ${id} 的请求:`, productData);

    try {
        const payload = mapProductToDbPayload(productData);
        if (Object.keys(payload).length === 0) {
            return res.status(400).json({ code: 40001, message: '没有提供需要更新的字段。' });
        }
        const setClauses = Object.keys(payload).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(payload), id];
        const sql = `UPDATE products SET ${setClauses} WHERE id = ?`;
        const [result] = await db.query(sql, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 40401, message: '未找到指定ID的产品。' });
        }
        const [updatedProduct] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        res.json({ 
            code: 20000, 
            data: mapRowToProduct(updatedProduct[0])
        });
    } catch (error) {
        console.error(`修改产品 ${id} API 数据库操作出错:`, error);
        res.status(500).json({ code: 50000, message: '服务器内部错误，修改产品失败。' });
    }
});

/**
 * 删除产品
 * DELETE /api/products/:id
 */
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`接收到删除产品 ${id} 的请求`);
    try {
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 40401, message: '未找到指定ID的产品。' });
        }
        res.json({ code: 20000, data: 'success' });
    } catch (error) {
        console.error(`删除产品 ${id} API 数据库操作出错:`, error);
        res.status(500).json({ code: 50000, message: '服务器内部错误，删除产品失败。' });
    }
});

// --- 交易管理 API ---
/**
 * 获取交易列表
 * GET /api/transaction/list
 */
app.get('/api/transaction/list', async (req, res) => {
  console.log('接收到获取交易列表的请求');
  try {
    const [items] = await db.query('SELECT * FROM transactions ORDER BY created_at DESC');
    res.json({
      code: 20000,
      data: {
        items: items
      }
    });
  } catch (error) {
    console.error('获取交易列表 API 查询数据库时出错:', error);
    res.status(500).json({
      code: 50000,
      message: '服务器内部错误，获取交易列表失败。'
    });
  }
});

// --- 生产管理 API ---
/**
 * 获取生产计划列表
 * GET /api/production/plan/list
 */
app.get('/api/production/plan/list', async (req, res) => {
  console.log('接收到获取生产计划列表的请求');
  try {
    const [rows] = await db.query('SELECT * FROM production_plans ORDER BY start_time DESC');
    const items = rows.map(item => ({
      id: item.id,
      productName: item.product_name,
      targetAmount: item.target_amount,
      unit: item.unit,
      startTime: item.start_time,
      status: item.status,
      remark: item.remark
    }));
    res.json({
      code: 20000,
      data: {
        items: items
      }
    });
  } catch (error) {
    console.error('获取生产计划列表 API 查询数据库时出错:', error);
    res.status(500).json({
      code: 50000,
      message: '服务器内部错误，获取生产计划列表失败。'
    });
  }
});

/**
 * 获取生产记录列表
 * GET /api/production/record/list
 */
app.get('/api/production/record/list', async (req, res) => {
  console.log('接收到获取生产记录列表的请求');
  try {
    const [rows] = await db.query('SELECT * FROM production_records ORDER BY production_time DESC');
    const items = rows.map(item => ({
        id: item.id,
        planId: item.plan_id,
        productName: item.product_name,
        actualAmount: item.actual_amount,
        unit: item.unit,
        productionTime: item.production_time,
        operator: item.operator,
        qualityCheck: item.quality_check,
        qualityReport: item.quality_report,
        materials: item.materials
    }));
    res.json({
      code: 20000,
      data: {
        items: items
      }
    });
  } catch (error) {
    console.error('获取生产记录列表 API 查询数据库时出错:', error);
    res.status(500).json({
      code: 50000,
      message: '服务器内部错误，获取生产记录列表失败。'
    });
  }
});

/**
 * 新增生产计划
 * POST /api/production/plan
 */
app.post('/api/production/plan', async (req, res) => {
  const { id, product_name, target_amount, unit, start_time, status } = req.body;
  const formattedStartTime = start_time.replace('T', ' ').substring(0, 19);
  try {
    await db.query(
      'INSERT INTO production_plans (id, product_name, target_amount, unit, start_time, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, product_name, target_amount, unit, formattedStartTime, status]
    );
    res.status(201).json({ code: 20000, data: { ...req.body } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ code: 40901, message: '生产计划ID已存在。' });
    }
    console.error('新增生产计划 API 出错:', error);
    res.status(500).json({ code: 50000, message: '服务器错误，新增生产计划失败。' });
  }
});

/**
 * 修改生产计划
 * PUT /api/production/plan/:id
 */
app.put('/api/production/plan/:id', async (req, res) => {
  const { id } = req.params;
  const { product_name, target_amount, unit, start_time, status } = req.body;
  const formattedStartTime = start_time.replace('T', ' ').substring(0, 19);
  console.log(`接收到修改生产计划 ${id} 的请求，格式化后时间:`, formattedStartTime);
  try {
    const [result] = await db.query(
      'UPDATE production_plans SET product_name = ?, target_amount = ?, unit = ?, start_time = ?, status = ? WHERE id = ?',
      [product_name, target_amount, unit, formattedStartTime, status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ code: 40401, message: '未找到计划。' });
    res.json({ code: 20000, data: 'success' });
  } catch (error) {
    console.error(`修改生产计划 ${id} API 出错:`, error);
    res.status(500).json({ code: 50000, message: '服务器错误，修改生产计划失败。' });
  }
});

/**
 * 删除生产计划
 * DELETE /api/production/plan/:id
 */
app.delete('/api/production/plan/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM production_plans WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: 40401, message: '未找到计划。' });
    res.json({ code: 20000, data: 'success' });
  } catch (error) {
    console.error(`删除生产计划 ${id} API 出错:`, error);
    res.status(500).json({ code: 50000, message: '服务器错误，删除生产计划失败。' });
  }
});

/**
 * 新增生产记录
 * POST /api/production/record
 */
app.post('/api/production/record', async (req, res) => {
  const { id, plan_id, product_name, actual_amount, unit, production_time, operator, quality_check, materials_used, quality_report } = req.body;
  const formattedProductionTime = production_time.replace('T', ' ').substring(0, 19);
  try {
    await db.query(
      'INSERT INTO production_records (id, plan_id, product_name, actual_amount, unit, production_time, operator, quality_check, materials_used, quality_report) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, plan_id, product_name, actual_amount, unit, formattedProductionTime, operator, quality_check, JSON.stringify(materials_used), quality_report]
    );
    res.status(201).json({ code: 20000, data: { ...req.body } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ code: 40901, message: '生产记录ID已存在。' });
    }
    console.error('新增生产记录 API 出错:', error);
    res.status(500).json({ code: 50000, message: '服务器错误，新增生产记录失败。' });
  }
});

/**
 * 修改生产记录
 * PUT /api/production/record/:id
 */
app.put('/api/production/record/:id', async (req, res) => {
  const { id } = req.params;
  const { plan_id, product_name, actual_amount, unit, production_time, operator, quality_check, materials_used, quality_report } = req.body;
  const formattedProductionTime = production_time.replace('T', ' ').substring(0, 19);
  try {
    const [result] = await db.query(
      'UPDATE production_records SET plan_id = ?, product_name = ?, actual_amount = ?, unit = ?, production_time = ?, operator = ?, quality_check = ?, materials_used = ?, quality_report = ? WHERE id = ?',
      [plan_id, product_name, actual_amount, unit, formattedProductionTime, operator, quality_check, JSON.stringify(materials_used), quality_report, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ code: 40401, message: '未找到记录。' });
    res.json({ code: 20000, data: 'success' });
  } catch (error) {
    console.error(`修改生产记录 ${id} API 出错:`, error);
    res.status(500).json({ code: 50000, message: '服务器错误，修改生产记录失败。' });
  }
});

/**
 * 删除生产记录
 * DELETE /api/production/record/:id
 */
app.delete('/api/production/record/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM production_records WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: 40401, message: '未找到记录。' });
    res.json({ code: 20000, data: 'success' });
  } catch (error) {
    console.error(`删除生产记录 ${id} API 出错:`, error);
    res.status(500).json({ code: 50000, message: '服务器错误，删除生产记录失败。' });
  }
});

// --- 用户管理 API ---
/**
 * 获取用户列表
 * GET /api/users
*/
app.get('/api/users', async (req, res) => {
  console.log('接收到获取用户列表的请求');
  try {
    const [users] = await db.query("SELECT id, username, role, email, is_active, created_at FROM users");
    res.json({
        code: 20000,
        data: users
    });
  } catch (error) {
    console.error('获取用户列表 API 查询数据库时出错:', error);
    res.status(500).json({
      code: 50000,
      message: '服务器内部错误，获取用户列表失败。'
    });
  }
});

/**
 * 新增用户 (密码不加密)
 * POST /api/users
 */
app.post('/api/users', async (req, res) => {
  const { username, password, role, email } = req.body;
  console.log('接收到新增用户请求:', { username, role, email });

  if (!username || !password) {
    return res.status(400).json({ code: 40001, message: '用户名和密码不能为空。' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)',
      [username, password, role, email]
    );
    res.status(201).json({
      code: 20000,
      data: { id: result.insertId, username, role, email }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ code: 40901, message: '用户名或邮箱已存在。' });
    }
    console.error('新增用户 API 数据库操作出错:', error);
    res.status(500).json({ code: 50000, message: '服务器内部错误，新增用户失败。' });
  }
});

/**
 * 修改用户
 * PUT /api/users/:id
 */
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { role, email, is_active } = req.body;
  console.log(`接收到修改用户 ${id} 的请求:`, { role, email, is_active });

  try {
    const [result] = await db.query(
      'UPDATE users SET role = ?, email = ?, is_active = ? WHERE id = ?',
      [role, email, is_active, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 40401, message: '未找到指定ID的用户。' });
    }

    res.json({ code: 20000, data: 'success' });
  } catch (error) {
     if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ code: 40901, message: '邮箱已存在。' });
    }
    console.error(`修改用户 ${id} API 数据库操作出错:`, error);
    res.status(500).json({ code: 50000, message: '服务器内部错误，修改用户失败。' });
  }
});

/**
 * 删除用户
 * DELETE /api/users/:id
 */
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`接收到删除用户 ${id} 的请求`);

  if (id === '1') {
    return res.status(403).json({ code: 40301, message: '出于安全考虑，禁止删除超级管理员。' });
  }

  try {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 40401, message: '未找到指定ID的用户。' });
    }
    
    res.json({ code: 20000, data: 'success' });
  } catch (error) {
    console.error(`删除用户 ${id} API 数据库操作出错:`, error);
    res.status(500).json({ code: 50000, message: '服务器内部错误，删除用户失败。' });
  }
});

// --- 启动服务器 ---
app.listen(port, async () => {
  try {
    const connection = await db.getConnection();
    console.log('🎉 数据库连接成功！');
    connection.release();
    console.log(`后端服务器正在 http://localhost:${port} 上运行`);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
});