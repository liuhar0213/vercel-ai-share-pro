// 本地生成 JWT（可绕过兑换步骤直接发 token 给熟人）
// 用法：
//   npm i jsonwebtoken
//   node scripts/generate_jwt.js user_001 "你的JWT_SECRET"
import jwt from 'jsonwebtoken';
const uid = process.argv[2] || 'user_001';
const secret = process.argv[3] || 'change_this_to_a_long_random_string';
const token = jwt.sign({ uid, plan: 'basic' }, secret, { expiresIn: '30d' });
console.log('uid:', uid);
console.log('token:', token);
console.log('\\n请求头加：Authorization: Bearer ' + token);
