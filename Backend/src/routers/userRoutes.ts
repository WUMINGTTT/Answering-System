import { Router, type IRouter } from 'express';
import * as userController from '../controllers/userController.js';

const router: IRouter = Router();

/** POST /api/users/register — 用户注册 */
router.post('/register', userController.register);

/** POST /api/users/login — 用户登录 */
router.post('/login', userController.login);

/** POST /api/users/logout — 用户登出 */
router.post('/logout', userController.logout);

/** POST /api/users — 新增用户（管理员创建） */
router.post('/', userController.create);

/** GET /api/users/me — 获取当前登录用户（通过 cookie） */
router.get('/me', userController.me);

/** GET /api/users — 获取全部用户 */
router.get('/', userController.getAll);

/** GET /api/users/:id — 获取单个用户 */
router.get('/:id', userController.getById);

/** DELETE /api/users — 删除全部用户 */
router.delete('/', userController.removeAll);

/** DELETE /api/users/:id — 删除单个用户 */
router.delete('/:id', userController.remove);

/** PUT /api/users/:id — 修改用户信息 */
router.put('/:id', userController.update);

export default router;
