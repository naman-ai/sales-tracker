'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase, todayISO } from '@/lib/supabase'
import { DailyStat, LeaderboardEntry, totalAttempts } from '@/lib/types'

interface Props {
  userName: string
  date: string
  refreshKey: number
}

function toEntry(s: DailyStat): LeaderboardEntry {
  const total = totalAttempts(s)
  return {
    user_name: s.user_name,
    total,
    conn_count: s.conn_count,
    meetings: s.meetings,
    connect_rate: total > 0 ? Math.round((s.conn_count / total) * 100) : 0,
    booking_rate: total > 0 ? Math.round((s.meetings / total) * 100) : 0,
  }
}

export default function Leaderboard({ userName, date, refreshKey }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('date', date)
      .order('updated_at', { ascending: false })
    if (!data) return
    const sorted = (data as DailyStat[])
      .map(toEntry)
      .sort((a, b) => b.total - a.total)
    setEntries(sorted)
  }, [date])

  useEffect(() => { load() }, [load, refreshKey])

  useEffect(() => {
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_stats' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const isToday = date === todayISO()

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-title">
        <span>Leaderboard</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isToday && <span className="live-dot" />}
          <span style={{ fontSize: 10 }}>{isToday ? 'live' : date}</span>
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="lb-empty">no calls yet today ✨</div>
      ) : (
        entries.map((e, i) => (
          <div className="lb-row" key={e.user_name}>
            <span className={`lb-rank ${i === 0 ? 'top' : ''}`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <span className={`lb-name ${e.user_name === userName ? 'is-you' : ''}`}>
              {e.user_name}{e.user_name === userName ? ' (you)' : ''}
            </span>
            <span className="lb-stats">
              <span className="lb-total">{e.total} calls</span>
              <span className="lb-rate">{e.connect_rate}% conn</span>
              <span className="lb-meetings">{e.meetings} mtg</span>
            </span>
          </div>
        ))
      )}
    </div>
  )
}
