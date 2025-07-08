// 引入依赖
const express = require('express');
const cors = require('cors');

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
 * 模拟登录接口
 * POST /api/user/login
 */
app.post('/api/user/login', (req, res) => {
  const { username, password } = req.body;

  console.log('接收到登录请求:', { username, password });

  // 在真实项目中，这里你需要查询数据库验证用户名和密码
  // 这里我们简单地模拟成功登录
  if (username === 'admin' && password === '111111') {
    res.json({
      code: 20000, // 遵循你项目中已有的成功码
      data: {
        token: 'mock-admin-token' // 返回一个模拟的 token
      }
    });
  } else {
    res.status(400).json({
      code: 50008,
      message: '用户名或密码错误。'
    });
  }
});

/**
 * 模拟获取用户信息的接口
 * GET /api/user/info
 */
app.get('/api/user/info', (req, res) => {
  // 从请求头中获取 token (仅为演示)
  const token = req.headers['x-token']; 
  console.log('接收到获取用户信息的请求，token:', token);

  // 验证 token (简单模拟)
  if (token === 'mock-admin-token') {
    res.json({
      code: 20000,
      data: {
        roles: ['admin'], // 用户的角色
        introduction: '我是一个超级管理员', // 介绍
        avatar: 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif', // 头像
        name: 'Super Admin' // 用户名
      }
    });
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
app.listen(port, () => {
  console.log(`后端服务器正在 http://localhost:${port} 上运行`);
});


// --- API 路由定义 ---

// --- 废料管理 API ---

// 模拟的废料数据库 (新结构)
const wasteMaterials = [
  {
    id: 1,
    name: '废弃硅钢片',
    storageArea: 'A区-01架',
    composition: { Si: 95.5, Fe: 3.2, Cu: 0.1, Mn: 0.2, Mg: 0.05, Zn: 0.0, Ti: 0.0, Cr: 0.0, Ni: 0.0, Zr: 0.0, Sr: 0.0, Bi: 0.0, Na: 0.0, AL: 0.95, other: 0.0 },
    stock: 1250, // 单位: kg
    unitPrice: 15.5 // 单位: 元/kg
  },
  {
    id: 2,
    name: '废弃电路板',
    storageArea: 'B区-03架',
    composition: { Si: 25.0, Fe: 5.0, Cu: 20.0, Mn: 0.5, Mg: 0.0, Zn: 1.5, Ti: 0.0, Cr: 0.1, Ni: 0.2, Zr: 0.0, Sr: 0.0, Bi: 0.0, Na: 0.0, AL: 10.0, other: 37.7 },
    stock: 2500,
    unitPrice: 25.0
  },
  {
    id: 3,
    name: '废旧电缆',
    storageArea: 'A区-02架',
    composition: { Si: 0.5, Fe: 1.0, Cu: 65.0, Mn: 0.0, Mg: 0.0, Zn: 0.0, Ti: 0.0, Cr: 0.0, Ni: 0.0, Zr: 0.0, Sr: 0.0, Bi: 0.0, Na: 0.0, AL: 33.5, other: 0.0 },
    stock: 850,
    unitPrice: 45.0
  }
];

/**
 * 获取废料列表
 * GET /api/waste-material/list
 */
app.get('/api/waste-material/list', (req, res) => {
  console.log('接收到获取废料列表的请求 (新结构)');
  res.json({
    code: 20000,
    data: {
      items: wasteMaterials,
      total: wasteMaterials.length
    }
  });
});

/**
 * 获取交易列表
 * GET /api/transaction/list
 */
app.get('/api/transaction/list', (req, res) => {
  console.log('接收到获取交易列表的请求');
  
  // 模拟一些交易数据
  const items = [
    { order_no: 'd8a245-5a82-39c2-c17c-a45d', price: 9922.5, status: 'success' },
    { order_no: '2d80-4f51-789a-ce2a-43d1', price: 7374.8, status: 'pending' },
    { order_no: 'd195-2ed6-34a8-65e1-80f4', price: 7795.4, status: 'success' },
    { order_no: 'a718-a59e-4c7b-3b32-e00f', price: 5491.5, status: 'success' },
    { order_no: '3f54-53c8-472d-88b1-389c', price: 1499.2, status: 'success' },
    { order_no: '878b-5efe-49cb-4e92-f7b7', price: 4268.4, status: 'success' },
    { order_no: '6de4-142a-4f16-e30a-42c2', price: 2342.3, status: 'pending' },
    { order_no: 'c0b8-4c9f-3a2b-d3b5-2ad1', price: 2470.4, status: 'success' }
  ];
  
  res.json({
    code: 20000,
    data: {
      items: items
    }
  });
});

// --- 生产管理 API ---

// 模拟的生产计划数据
const productionPlans = [
  { id: 'P001', productName: '高纯度铜', targetAmount: 1000, unit: 'kg', startTime: new Date(), status: 'pending' },
  { id: 'P002', productName: '铝合金', targetAmount: 5000, unit: 'kg', startTime: new Date(new Date().getTime() - 86400000), status: 'processing' },
  { id: 'P003', productName: '高纯度铜', targetAmount: 800, unit: 'kg', startTime: new Date(new Date().getTime() - 172800000), status: 'completed' }
];

// 模拟的生产记录数据
const productionRecords = [
    { id: 'R001', planId: 'P003', productName: '高纯度铜', actualAmount: 785, unit: 'kg', productionTime: new Date(new Date().getTime() - 172800000), operator: '张三', qualityCheck: 'pass',
      materials: [ { name: '废铜线', amount: 850, unit: 'kg' } ], qualityReport: '纯度达到99.9%，符合标准。'
    }
];

/**
 * 获取生产计划列表
 * GET /api/production/plan/list
 */
app.get('/api/production/plan/list', (req, res) => {
  console.log('接收到获取生产计划列表的请求');
  res.json({
    code: 20000,
    data: {
      items: productionPlans
    }
  });
});

/**
 * 获取生产记录列表
 * GET /api/production/record/list
 */
app.get('/api/production/record/list', (req, res) => {
  console.log('接收到获取生产记录列表的请求');
  res.json({
    code: 20000,
    data: {
      items: productionRecords
    }
  });
});

// --- 用户管理 API ---

// 模拟的用户数据库
let users = [
  { id: 1, username: 'admin', role: 'admin', email: 'admin@example.com', is_active: true },
  { id: 2, username: 'operator', role: 'operator', email: 'op@example.com', is_active: true },
  { id: 3, username: 'viewer', role: 'viewer', email: 'viewer@example.com', is_active: false }
];

/**
* 获取用户列表
* GET /api/users
*/
app.get('/api/users', (req, res) => {
  console.log('接收到获取用户列表的请求');
  res.json({
      code: 20000,
      data: users
  });
});