export interface ScoreDetail {
  id: string
  score: number
  reason: string
  createdAt: number
}

export interface CreateScore {
  score: number
  reason: string
}
