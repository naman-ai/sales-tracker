export type Category = 'na' | 'vm' | 'cb' | 'conn' | 'busy'

export interface DailyStat {
  id: string
  user_name: string
  avatar: string
  date: string
  na_count: number
  vm_count: number
  cb_count: number
  conn_count: number
  busy_count: number
  meetings: number
  updated_at: string
}

export interface LeaderboardEntry {
  user_name: string
  avatar: string
  total: number
  conn_count: number
  meetings: number
  connect_rate: number
  booking_rate: number
}

export const CATEGORIES: { key: Category; label: string; dot: string; color: string }[] = [
  { key: 'na',   label: 'No answer',    dot: '#ccc',    color: '#aaa' },
  { key: 'vm',   label: 'Voicemail',    dot: '#7aafd4', color: '#3a6fa8' },
  { key: 'cb',   label: 'Callback req', dot: '#f0b84a', color: '#a07830' },
  { key: 'conn', label: 'Connected',    dot: '#1a9a9a', color: '#0f6a6a' },
  { key: 'busy', label: 'Busy / wrong', dot: '#e88080', color: '#a03a3a' },
]

export function totalAttempts(s: Pick<DailyStat, 'na_count' | 'vm_count' | 'cb_count' | 'conn_count' | 'busy_count'>) {
  return s.na_count + s.vm_count + s.cb_count + s.conn_count + s.busy_count
}
