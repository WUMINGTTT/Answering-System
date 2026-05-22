import { Router, type IRouter } from 'express';
import * as scoreController from '../controllers/scoreController.js';

const router: IRouter = Router({ mergeParams: true });

/** POST /api/users/:id/scores — 添加得分 */
router.post('/', scoreController.add);

/** DELETE /api/users/:id/scores — 删除全部得分 */
router.delete('/', scoreController.removeAll);

/** DELETE /api/users/:id/scores/:scoreId — 删除单条得分 */
router.delete('/:scoreId', scoreController.remove);

export default router;
