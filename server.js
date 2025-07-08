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