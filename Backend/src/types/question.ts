/** 题目类型: 单选 / 多选 / 主观 */
export type QuestionType = 'single' | 'multiple' | 'subjective';

/** 所属类: 必答题 / 抢答题 / 风险题 */
export type QuestionCategory = 'required' | 'quick-answer' | 'risk';

export interface Question {
  id: string;
  type: QuestionType;
  category: QuestionCategory;
  stem: string;
  options: string[];
  answers: string[];
  score: number;
}

/** 新增题目时不传 id，由后端生成 */
export type CreateQuestion = Omit<Question, 'id'>;

/** 修改题目时所有业务字段可选 */
export type UpdateQuestion = Partial<CreateQuestion>;
