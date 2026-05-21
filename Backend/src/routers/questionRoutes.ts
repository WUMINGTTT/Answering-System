import { Router, type IRouter } from 'express';
import * as questionController from '../controllers/questionController.js';

const router: IRouter = Router();

/** POST /api/questions — 新增题目 */
router.post('/', questionController.create);

/** GET /api/questions — 获取全部题目 */
router.get('/', questionController.getAll);

/** GET /api/questions/:id — 获取单个题目 */
router.get('/:id', questionController.getById);

/** PUT /api/questions/:id — 修改题目 */
router.put('/:id', questionController.update);

/** DELETE /api/questions — 删除全部题目 */
router.delete('/', questionController.removeAll);

/** DELETE /api/questions/:id — 删除单个题目 */
router.delete('/:id', questionController.remove);

export default router;
