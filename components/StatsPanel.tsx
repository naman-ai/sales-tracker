'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { DailyStat, totalAttempts } from '@/lib/types'

interface ChartPoint {
  date: string
  label: string
  total: number
  conn_count: number
  meetings: number
  na_count: number
  vm_count: number
  cb_count: number
  busy_count: number
  connect_rate: number
  booking_rate: number
}

const METRICS = [
  { key: 'total',        label: 'Total calls',    color: '#5bbcbc', type: 'bar',  axis: 'left'  },
  { key: 'conn_count',   label: 'Connected',      color: '#1a9a9a', type: 'bar',  axis: 'left'  },
  { key: 'meetings',     label: 'Meetings',       color: '#f0b84a', type: 'bar',  axis: 'left'  },
  { key: 'na_count',     label: 'No answer',      color: '#ccc',    type: 'bar',  axis: 'left'  },
  { key: 'vm_count',     label: 'Voicemail',      color: '#7aafd4', type: 'bar',  axis: 'left'  },
  { key: 'cb_count',     label: 'Callback req',   color: '#f0b84a', type: 'bar',  axis: 'left'  },
  { key: 'busy_count',   label: 'Busy / wrong',   color: '#e88080', type: 'bar',  axis: 'left'  },
  { key: 'connect_rate', label: 'Connect rate %', color: '#1a9a9a', type: 'line', axis: 'right' },
  { key: 'booking_rate', label: 'Booking rate %', color: '#e88080', type: 'line', axis: 'right' },
] as const

const DEFAULT_ACTIVE = new Set(['total', 'conn_count', 'meetings', 'connect_rate'])

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toPoint(s: DailyStat): ChartPoint {
  const total = totalAttempts(s)
  return {
    date: s.date,
    label: fmtDate(s.date),
    total,
    conn_count: s.conn_count,
    meetings: s.meetings,
    na_count: s.na_count,
    vm_count: s.vm_count,
    cb_count: s.cb_count,
    busy_count: s.busy_count,
    connect_rate: total > 0 ? Math.round((s.conn_count / total) * 100) : 0,
    booking_rate: total > 0 ? Math.round((s.meetings / total) * 100) : 0,
  }
}

interface Props { userName: string }

export default function StatsPanel({ userName }: Props) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<ChartPoint[]>([])
  const [active, setActive] = useState<Set<string>>(DEFAULT_ACTIVE)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: rows } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_name', userName)
      .order('date', { ascending: true })
      .limit(30)
    if (rows) setData((rows as DailyStat[]).map(toPoint))
    setLoading(false)
  }, [userName])

  useEffect(() => {
    if (open && data.length === 0) load()
  }, [open, data.length, load])

  function toggle(key: string) {
    setActive(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const hasRightAxis = METRICS.some(m => m.axis === 'right' && active.has(m.key))

  return (
    <div className="stats-wrap">
      <button className="stats-toggle-btn" onClick={() => setOpen(o => !o)}>
        {open ? 'hide stats ↑' : 'stats for nerds 🤓'}
      </button>

      {open && (
        <div className="stats-panel">
          {/* Metric toggles */}
          <div className="metric-legend">
            {METRICS.map(m => (
              <button
                key={m.key}
                className={`metric-pill${active.has(m.key) ? ' active' : ''}`}
                style={active.has(m.key) ? { borderColor: m.color, background: m.color + '22', color: m.color } : {}}
                onClick={() => toggle(m.key)}
              >
                <span className="metric-dot" style={{ background: m.color }} />
                {m.label}
                {m.axis === 'right' ? ' (%)' : ''}
              </button>
            ))}
          </div>

          {loading && <div className="stats-loading">loading your data…</div>}

          {!loading && data.length === 0 && (
            <div className="stats-loading">no history yet — start logging calls!</div>
          )}

          {!loading && data.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data} margin={{ top: 8, right: hasRightAxis ? 40 : 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e0f4f4" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fill: '#7ab8b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fill: '#7ab8b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                {hasRightAxis && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fontFamily: 'DM Mono, monospace', fill: '#7ab8b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tickFormatter={v => `${v}%`}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1.5px solid #b2e0e0',
                    borderRadius: 12,
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 12,
                    color: '#0f2e2e',
                  }}
                  formatter={(value, name) => {
                    const m = METRICS.find(x => x.label === name || x.key === name)
                    const suffix = m?.axis === 'right' ? '%' : ''
                    return [`${value}${suffix}`, name]
                  }}
                />
                {METRICS.filter(m => m.type === 'bar' && active.has(m.key)).map(m => (
                  <Bar
                    key={m.key}
                    yAxisId="left"
                    dataKey={m.key}
                    name={m.label}
                    fill={m.color}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                ))}
                {METRICS.filter(m => m.type === 'line' && active.has(m.key)).map(m => (
                  <Line
                    key={m.key}
                    yAxisId="right"
                    dataKey={m.key}
                    name={m.label}
                    stroke={m.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {/* Summary cards */}
          {!loading && data.length > 0 && (() => {
            const totals = data.reduce((acc, d) => ({
              calls: acc.calls + d.total,
              conn: acc.conn + d.conn_count,
              meetings: acc.meetings + d.meetings,
            }), { calls: 0, conn: 0, meetings: 0 })
            const days = data.filter(d => d.total > 0).length
            return (
              <div className="stats-summary">
                <div className="stats-stat">
                  <div className="stats-stat-value">{totals.calls}</div>
                  <div className="stats-stat-label">total calls</div>
                </div>
                <div className="stats-stat">
                  <div className="stats-stat-value">{days > 0 ? Math.round(totals.calls / days) : 0}</div>
                  <div className="stats-stat-label">avg / day</div>
                </div>
                <div className="stats-stat">
                  <div className="stats-stat-value">{totals.calls > 0 ? Math.round((totals.conn / totals.calls) * 100) : 0}%</div>
                  <div className="stats-stat-label">connect rate</div>
                </div>
                <div className="stats-stat">
                  <div className="stats-stat-value">{totals.meetings}</div>
                  <div className="stats-stat-label">meetings booked</div>
                </div>
                <div className="stats-stat">
                  <div className="stats-stat-value">{totals.calls > 0 ? Math.round((totals.meetings / totals.calls) * 100) : 0}%</div>
                  <div className="stats-stat-label">booking rate</div>
                </div>
                <div className="stats-stat">
                  <div className="stats-stat-value">{days}</div>
                  <div className="stats-stat-label">days active</div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
