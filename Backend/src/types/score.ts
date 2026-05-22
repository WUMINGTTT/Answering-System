export interface ScoreDetail {
  id: string;
  score: number;
  reason: string;
}

/** 添加得分, id 由后端自动生成 */
export type CreateScore = Pick<ScoreDetail, 'score' | 'reason'>;
