# Answering System API 文档

Base URL: `http://localhost:3000`

## 通用响应格式

所有接口统一返回：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | `number` | 状态码，与 HTTP 状态码一致 |
| `message` | `string` | 操作提示信息 |
| `data` | `any` | 响应数据，无数据时为 `null` |

---

## 题目数据结构

```typescript
interface Question {
  id: string;       // 10位纯字母，后端自动生成
  type: string;     // "single" | "multiple" | "subjective"（单选 / 多选 / 主观）
  category: string; // "required" | "quick-answer" | "risk"（必答 / 抢答 / 风险）
  stem: string;     // 题干
  options: string[];// 选项
  answers: string[];// 答案
  score: number;    // 分值
}
```

---

## 1. 新增题目

```
POST /api/questions
Content-Type: application/json
```

**请求体：**

```json
{
  "type": "single",
  "category": "required",
  "stem": "以下哪个是中国的首都？",
  "options": ["北京", "上海", "广州", "深圳"],
  "answers": ["北京"],
  "score": 10
}
```

**成功响应 (201)：**

```json
{
  "code": 201,
  "message": "题目创建成功",
  "data": {
    "id": "aBcDeFgHiJ",
    "type": "single",
    "category": "required",
    "stem": "以下哪个是中国的首都？",
    "options": ["北京", "上海", "广州", "深圳"],
    "answers": ["北京"],
    "score": 10
  }
}
```

**失败响应 (400)：**

```json
{
  "code": 400,
  "message": "缺少必填字段: type, category, stem, options, answers, score",
  "data": null
}
```

---

## 2. 获取全部题目

```
GET /api/questions
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "全部题目获取成功",
  "data": [
    {
      "id": "aBcDeFgHiJ",
      "type": "single",
      "category": "required",
      "stem": "以下哪个是中国的首都？",
      "options": ["北京", "上海", "广州", "深圳"],
      "answers": ["北京"],
      "score": 10
    }
  ]
}
```

---

## 3. 获取单个题目

```
GET /api/questions/:id
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "题目获取成功",
  "data": {
    "id": "aBcDeFgHiJ",
    "type": "single",
    "category": "required",
    "stem": "以下哪个是中国的首都？",
    "options": ["北京", "上海", "广州", "深圳"],
    "answers": ["北京"],
    "score": 10
  }
}
```

**失败响应 (404)：**

```json
{
  "code": 404,
  "message": "题目不存在",
  "data": null
}
```

---

## 4. 修改题目

```
PUT /api/questions/:id
Content-Type: application/json
```

所有业务字段均为可选，至少提供一个。

**请求体：**

```json
{
  "stem": "以下哪个是法国的首都？",
  "options": ["巴黎", "伦敦", "柏林", "马德里"],
  "answers": ["巴黎"],
  "score": 20
}
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "题目修改成功",
  "data": {
    "id": "aBcDeFgHiJ",
    "type": "single",
    "category": "required",
    "stem": "以下哪个是法国的首都？",
    "options": ["巴黎", "伦敦", "柏林", "马德里"],
    "answers": ["巴黎"],
    "score": 20
  }
}
```

**失败响应 (400)：**

```json
{
  "code": 400,
  "message": "至少需要提供一个要修改的字段",
  "data": null
}
```

**失败响应 (404)：**

```json
{
  "code": 404,
  "message": "题目不存在",
  "data": null
}
```

---

## 5. 删除单个题目

```
DELETE /api/questions/:id
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "题目删除成功",
  "data": null
}
```

**失败响应 (404)：**

```json
{
  "code": 404,
  "message": "题目不存在",
  "data": null
}
```

---

## 6. 删除全部题目

```
DELETE /api/questions
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "全部题目已删除",
  "data": null
}
```

---

## 字段约束

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `type` | `string` | 是 | `"single"` 单选 / `"multiple"` 多选 / `"subjective"` 主观 |
| `category` | `string` | 是 | `"required"` 必答题 / `"quick-answer"` 抢答题 / `"risk"` 风险题 |
| `stem` | `string` | 是 | 题干文本 |
| `options` | `string[]` | 是 | 选项列表 |
| `answers` | `string[]` | 是 | 正确答案列表 |
| `score` | `number` | 是 | 题目分值 |

---

## 用户数据结构

```typescript
type UserRole = 'player' | 'admin';

interface User {
  id: string;            // 10位纯字母，后端自动生成
  nickname: string;      // 昵称
  username: string;      // 用户名
  password: string;      // 密码
  totalScore: number;    // 总分
  scoreDetails: unknown[]; // 得分详情
  role: UserRole;        // "player" 选手 / "admin" 管理员
}
```

---

## 7. 用户注册

```
POST /api/users/register
Content-Type: application/json
```

**请求体：**

```json
{
  "nickname": "张三",
  "username": "zhangsan",
  "password": "123456"
}
```

**成功响应 (201)：**

```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "id": "aBcDeFgHiJ",
    "nickname": "张三",
    "username": "zhangsan",
    "password": "123456",
    "totalScore": 0,
    "scoreDetails": [],
    "role": "player"
  }
}
```

**失败响应 (400)：**

```json
{
  "code": 400,
  "message": "缺少必填字段: nickname, username, password",
  "data": null
}
```

**失败响应 (409)：**

```json
{
  "code": 409,
  "message": "用户名已存在",
  "data": null
}
```

---

## 8. 用户登录

```
POST /api/users/login
Content-Type: application/json
```

**请求体：**

```json
{
  "username": "zhangsan",
  "password": "123456"
}
```

**成功响应 (200)：**

登录成功后设置 Cookie `userId`（用户ID）和 `userRole`（用户身份），`httpOnly`，有效期 7 天。

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "id": "aBcDeFgHiJ",
    "nickname": "张三",
    "username": "zhangsan",
    "password": "123456",
    "totalScore": 0,
    "scoreDetails": [],
    "role": "player"
  }
}
```

**失败响应 (400)：**

```json
{
  "code": 400,
  "message": "缺少必填字段: username, password",
  "data": null
}
```

**失败响应 (401)：**

```json
{
  "code": 401,
  "message": "密码错误",
  "data": null
}
```

**失败响应 (404)：**

```json
{
  "code": 404,
  "message": "用户不存在",
  "data": null
}
```

---

## 9. 新增用户（管理员创建）

```
POST /api/users
Content-Type: application/json
```

管理员可指定用户角色。

**请求体：**

```json
{
  "nickname": "李四",
  "username": "lisi",
  "password": "123456",
  "role": "admin"
}
```

**成功响应 (201)：**

```json
{
  "code": 201,
  "message": "用户创建成功",
  "data": {
    "id": "kLmNoPqRsT",
    "nickname": "李四",
    "username": "lisi",
    "password": "123456",
    "totalScore": 0,
    "scoreDetails": [],
    "role": "admin"
  }
}
```

**失败响应 (400)：**

```json
{
  "code": 400,
  "message": "缺少必填字段: nickname, username, password, role",
  "data": null
}
```

---

## 10. 获取全部用户

```
GET /api/users
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "全部用户获取成功",
  "data": [
    {
      "id": "aBcDeFgHiJ",
      "nickname": "张三",
      "username": "zhangsan",
      "password": "123456",
      "totalScore": 0,
      "scoreDetails": [],
      "role": "player"
    }
  ]
}
```

---

## 11. 获取单个用户

```
GET /api/users/:id
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "用户获取成功",
  "data": {
    "id": "aBcDeFgHiJ",
    "nickname": "张三",
    "username": "zhangsan",
    "password": "123456",
    "totalScore": 0,
    "scoreDetails": [],
    "role": "player"
  }
}
```

**失败响应 (404)：**

```json
{
  "code": 404,
  "message": "用户不存在",
  "data": null
}
```

---

## 12. 修改用户信息

```
PUT /api/users/:id
Content-Type: application/json
```

所有业务字段均为可选，至少提供一个。

**请求体：**

```json
{
  "nickname": "张三三",
  "password": "654321"
}
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "用户信息修改成功",
  "data": {
    "id": "aBcDeFgHiJ",
    "nickname": "张三三",
    "username": "zhangsan",
    "password": "654321",
    "totalScore": 0,
    "scoreDetails": [],
    "role": "player"
  }
}
```

**失败响应 (400)：**

```json
{
  "code": 400,
  "message": "至少需要提供一个要修改的字段: nickname, username, password, role",
  "data": null
}
```

**失败响应 (404)：**

```json
{
  "code": 404,
  "message": "用户不存在",
  "data": null
}
```

**失败响应 (409)：**

```json
{
  "code": 409,
  "message": "用户名已存在",
  "data": null
}
```

---

## 13. 删除单个用户

```
DELETE /api/users/:id
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "用户删除成功",
  "data": null
}
```

**失败响应 (404)：**

```json
{
  "code": 404,
  "message": "用户不存在",
  "data": null
}
```

---

## 14. 删除全部用户

```
DELETE /api/users
```

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "全部用户已删除",
  "data": null
}
```

---

## 得分数据结构

```typescript
interface ScoreDetail {
  id: string;   // 10位纯字母，后端自动生成
  score: number; // 得分数，正数加分 / 负数扣分
  reason: string;// 得分原因
}
```

---

## 15. 添加得分

```
POST /api/users/:id/scores
Content-Type: application/json
```

为指定用户添加一条得分记录，同时自动更新该用户的总分。`score` 支持正数和负数。

**请求体：**

```json
{
  "score": 10,
  "reason": "回答正确"
}
```

**成功响应 (201)：**

```json
{
  "code": 201,
  "message": "得分添加成功",
  "data": {
    "id": "xYzAbCdEfG",
    "score": 10,
    "reason": "回答正确"
  }
}
```

**失败响应 (400)：**

```json
{
  "code": 400,
  "message": "缺少必填字段: score, reason",
  "data": null
}
```

**失败响应 (404)：**

```json
{
  "code": 404,
  "message": "用户不存在",
  "data": null
}
```

---

## 16. 删除单条得分

```
DELETE /api/users/:id/scores/:scoreId
```

删除一条得分记录，同时自动更新用户总分。

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "得分删除成功",
  "data": null
}
```

**失败响应 (404)：**

```json
{
  "code": 404,
  "message": "得分记录不存在",
  "data": null
}
```

---

## 17. 删除全部得分

```
DELETE /api/users/:id/scores
```

删除指定用户的全部得分记录，总分重置为 0。

**成功响应 (200)：**

```json
{
  "code": 200,
  "message": "全部得分已删除",
  "data": null
}
```

**失败响应 (404)：**

```json
{
  "code": 404,
  "message": "用户不存在",
  "data": null
}
```
