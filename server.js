// 引入依赖
const express = require('express');
const cors = require('cors');
const db = require('./db'); // 引入数据库连接池
// const bcrypt = require('bcrypt'); // 暂时禁用 bcrypt
// const saltRounds = 10;

// 创建 Express 应用
const app = express();
const port = 3000; // 你可以指定任何未被占用的端口

// --- 中间件配置 ---
// 1. 使用 cors 中间件解决跨域问题
app.use(cors()); 

// 2. 使用 express.json() 中间件来解析请求体中的 JSON 数据
app.use(express.json());

// --- API 路由定义 ---

/**
 * 登录接口 (已恢复为简单的明文对比)
 * POST /api/user/login
 */
app.post('/api/user/login', async (req, res) => {
  const { username, password } = req.body;

  console.log('登录请求(明文模式):', { username });

  if (!username || !password) {
    return res.status(400).json({ code: 40001, message: '用户名和密码不能为空。' });
  }

  try {
    // 直接在 SQL 查询中比对用户名和明文密码
    const [users] = await db.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );

    // 检查是否查询到用户
    if (users.length > 0) {
      const user = users[0];
      
      // 检查账户是否被禁用
      if (!user.is_active) {
        return res.status(403).json({
          code: 50012,
          message: '该账户已被禁用，请联系管理员。'
        });
      }

      // 登录成功
      res.json({
        code: 20000,
        data: {
          // 动态生成包含用户名的 token
          token: `mock-${user.username}-token`
        }
      });
    } else {
      // 用户名或密码错误
      res.status(401).json({
        code: 50008,
        message: '用户名或密码错误。'
      });
    }
  } catch (error) {
    console.error('登录 API 查询数据库时出错:', error);
    res.status(500).json({
      code: 50000,
      message: '服务器内部错误，请稍后重试。'
    });
  }
});

/**
 * 获取用户信息的接口 (已改造, 支持动态用户)
 * GET /api/user/info
 */
app.get('/api/user/info', async (req, res) => {
  const token = req.headers['x-token'];
  console.log('接收到获取用户信息的请求，token:', token);

  // 验证并从 token 中解析用户名
  if (token && token.startsWith('mock-') && token.endsWith('-token')) {
    const username = token.substring(5, token.length - 6); // 截取 'mock-' 和 '-token' 中间的用户名
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
    res.status(401).json({
      code: 50008,
      message: '无效的 token'
    });
  }
});

/**
 * 模拟用户登出的接口
 * POST /api/user/logout
 */
app.post('/api/user/logout', (req, res) => {
  console.log('接收到登出请求');
  // 后端在这里通常会做一些 token 失效处理
  res.json({
    code: 20000,
    data: 'success'
  });
});


// --- 启动服务器 ---
app.listen(port, async () => {
  try {
    // 尝试从连接池中获取一个连接，测试数据库连通性
    const connection = await db.getConnection();
    console.log('🎉 数据库连接成功！');
    // 释放连接，将其返回到连接池
    connection.release();
    console.log(`后端服务器正在 http://localhost:${port} 上运行`);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    // 如果数据库连接失败，可以选择退出进程
    process.exit(1);
  }
});


// --- API 路由定义 ---

// --- 废料管理 API ---
/**
 * 获取废料列表 (已改造)
 * GET /api/waste-material/list
 */
app.get('/api/waste-material/list', async (req, res) => {
  console.log('接收到获取废料列表的请求');
  try {
    const [rows] = await db.query('SELECT * FROM waste_materials ORDER BY id ASC');
    
    // 注意：数据库返回的字段名是 stock_kg，前端可能需要 stock。
    // 可以在这里进行映射，或者让前端直接使用新字段名。
    // 这里我们暂时直接返回，让前端适应。
    const items = rows.map(item => ({
        ...item,
        stock: item.stock_kg // 添加一个 stock 字段以兼容旧版前端（如果需要）
    }));

    res.json({
      code: 20000,
      data: {
        items: items,
        total: items.length
      }
    });
  } catch (error) {
    console.error('获取废料列表 API 查询数据库时出错:', error);
    res.status(500).json({
      code: 50000,
      message: '服务器内部错误，获取废料列表失败。'
    });
  }
});

// --- 废料管理 API (增删改) ---

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


/**
 * 获取交易列表 (已改造)
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
 * 获取生产计划列表 (已改造)
 * GET /api/production/plan/list
 */
app.get('/api/production/plan/list', async (req, res) => {
  console.log('接收到获取生产计划列表的请求');
  try {
    const [rows] = await db.query('SELECT * FROM production_plans ORDER BY start_time DESC');
    
    // --- [核心修改] 开始：将 snake_case 转换为 camelCase ---
    const items = rows.map(item => ({
      id: item.id,
      productName: item.product_name, // 数据库 product_name -> 前端 productName
      targetAmount: item.target_amount, // 数据库 target_amount -> 前端 targetAmount
      unit: item.unit,
      startTime: item.start_time, // 数据库 start_time -> 前端 startTime
      status: item.status,
      remark: item.remark
    }));
    // --- [核心修改] 结束 ---

    res.json({
      code: 20000,
      data: {
        items: items // 返回转换后的数据
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
 * 获取生产记录列表 (已改造)
 * GET /api/production/record/list
 */
app.get('/api/production/record/list', async (req, res) => {
  console.log('接收到获取生产记录列表的请求');
  try {
    const [rows] = await db.query('SELECT * FROM production_records ORDER BY production_time DESC');
    
    // --- [核心修改] 开始：将 snake_case 转换为 camelCase ---
    const items = rows.map(item => ({
        id: item.id,
        planId: item.plan_id, // 数据库 plan_id -> 前端 planId
        productName: item.product_name, // 数据库 product_name -> 前端 productName
        actualAmount: item.actual_amount, // 数据库 actual_amount -> 前端 actualAmount
        unit: item.unit,
        productionTime: item.production_time, // 数据库 production_time -> 前端 productionTime
        operator: item.operator,
        qualityCheck: item.quality_check, // 数据库 quality_check -> 前端 qualityCheck
        qualityReport: item.quality_report, // 数据库 quality_report -> 前端 qualityReport
        materials: item.materials // 假设 materials 是 JSON 字符串或前端可直接处理的格式
    }));
    // --- [核心修改] 结束 ---

    res.json({
      code: 20000,
      data: {
        items: items // 返回转换后的数据
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

// --- 生产管理 API (增删改) ---

// --- 生产计划 ---
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
  
  // 格式化 start_time 以适配 MySQL 的 DATETIME 类型
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
    // 在删除计划前，需要考虑如何处理关联的生产记录。
    // 方案1：一起删除 (CASCADE) - 在数据库层面设置
    // 方案2：将记录的 plan_id 设为 NULL (SET NULL) - 我们已在建表时设置
    // 方案3：禁止删除 - 在代码层面判断
    // 我们采用方案2，所以可以直接删除。
    const [result] = await db.query('DELETE FROM production_plans WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: 40401, message: '未找到计划。' });
    res.json({ code: 20000, data: 'success' });
  } catch (error) {
    console.error(`删除生产计划 ${id} API 出错:`, error);
    res.status(500).json({ code: 50000, message: '服务器错误，删除生产计划失败。' });
  }
});


// --- 生产记录 ---
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


/**
 * 获取用户列表 (已改造)
 * GET /api/users
*/
app.get('/api/users', async (req, res) => {
  console.log('接收到获取用户列表的请求');
  try {
    // 查询时排除 password 字段，保证安全
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
    // 直接存储明文密码
    const [result] = await db.query(
      'INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)',
      [username, password, role, email]
    );
    
    res.status(201).json({
      code: 20000,
      data: { id: result.insertId, username, role, email }
    });
  } catch (error) {
    // 捕获唯一键冲突错误 (例如用户名重复)
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

  // 防止误删ID为1的超级管理员
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