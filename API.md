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
