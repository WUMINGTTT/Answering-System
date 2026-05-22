export interface Question {
  id: string
  type: 'single' | 'multiple' | 'subjective'
  category: 'required' | 'quick-answer' | 'risk'
  stem: string
  options: string[]
  answers: string[]
  score: number
}

export type CreateQuestion = Omit<Question, 'id'>
export type UpdateQuestion = Partial<CreateQuestion>
