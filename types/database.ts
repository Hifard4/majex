export interface Major {
  id: number
  name: string
  created_at?: string
}

export interface ExchangeRequest {
  id: string
  user_id: string
  current_major_id: number
  target_major_id: number
  status: 'pending' | 'matched' | 'cancelled'
  created_at?: string
}
