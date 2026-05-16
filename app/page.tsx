'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, todayISO } from '@/lib/supabase'
import { CATEGORIES, Category, DailyStat, totalAttempts } from '@/lib/types'
import NamePrompt from '@/components/NamePrompt'
import Leaderboard from '@/components/Leaderboard'
import StatsPanel from '@/components/StatsPanel'

const ANIMALS = ['🐱','🐶','🐰','🦊','🐻','🐼','🐨','🐸','🐧','🦋','🐝','🦄','🐙','🐬','🦙','🐮','🐷','🐔','🦜','🦔','🐿️','🦭','🐺','🦊']
const HEARTS  = ['💕','💖','💗','💓','💝','😘','✨','💫','🌊','💞','❤️','🥰','💌','🩵','🫧']

const QUOTES = [
  "dial first. doubt never. 🔥",
  "the gatekeeper blinked first. you didn't. 😤",
  "voicemail is just a delayed yes. 📬",
  "your competition is sitting in their feelings. you're dialing. 💪",
  "they can smell the fear. don't have any. 🦁",
  "no answer is not a no — it's a not yet. ⏳",
  "every legend started with a cold list and a prayer. 🙏",
  "the quota doesn't negotiate. neither do you. 🤝",
  "smile. dial. get ghosted. repeat. 👻",
  "rejection is just redirection. painful, but still. 🚀",
  "the phone won't dial itself. unfortunately. 📞",
  "your pipeline is a garden. water it or cry later. 🌱",
  "coffee is for closers. dials are for winners. ☕",
  "be the gatekeeper's worst nightmare. 😈",
  "every no is just a yes wearing a disguise. 🕵️",
  "they hung up? cute. call back tomorrow. 😇",
  "you're not cold calling. you're warm hugging. 🫂",
  "make it rain, one awkward pause at a time. 🌧️",
  "somewhere out there, a deal is waiting. go find it. 🗺️",
  "your CRM is judging you. prove it wrong. 📊",
  "objections are just questions in a bad mood. 🙄",
  "the market doesn't care. dial anyway. 📈",
  "you miss 100% of the calls you don't make. 🏒",
  "another voicemail, another chance to shine. ✨",
  "the best salespeople got told no more than anyone. 🥇",
  "outbound isn't dead. it's just resting. 💤",
  "pick up the phone. your mortgage isn't paying itself. 🏠",
  "one more dial. just one more. okay, one more after that. 🔄",
]

const EMPTY_COUNTS: Record<Category, number> = { na: 0, vm: 0, cb: 0, conn: 0, busy: 0 }

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().slice(0, 10)
  })
}

function fmt(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Home() {
  const [userName, setUserName] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string>('🐱')
  const [quoteIdx, setQuoteIdx] = useState(0)
  const [quoteFade, setQuoteFade] = useState(true)
  const [clock, setClock] = useState('')
  const [counts, setCounts] = useState<Record<Category, number>>(EMPTY_COUNTS)
  const [meetings, setMeetings] = useState(0)
  const [log, setLog] = useState<{ label: string; t: string }[]>([])
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [lbRefresh, setLbRefresh] = useState(0)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isToday = selectedDate === todayISO()

  // Stockholm clock
  useEffect(() => {
    function tick() {
      setClock(new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' }))
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [])

  // Rotate quotes
  useEffect(() => {
    const id = setInterval(() => {
      setQuoteFade(false)
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length)
        setQuoteFade(true)
      }, 400)
    }, 6000)
    return () => clearInterval(id)
  }, [])

  // Read name + avatar from localStorage on mount
  useEffect(() => {
    const storedName = localStorage.getItem('ct_user_name')
    const storedAvatar = localStorage.getItem('ct_user_avatar')
    if (storedName) setUserName(storedName)
    if (storedAvatar) setAvatar(storedAvatar)
  }, [])

  // Load stats for selected date
  const loadStats = useCallback(async (name: string, date: string) => {
    const { data } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_name', name)
      .eq('date', date)
      .single()
    if (data) {
      const s = data as DailyStat
      setCounts({ na: s.na_count, vm: s.vm_count, cb: s.cb_count, conn: s.conn_count, busy: s.busy_count })
      setMeetings(s.meetings)
    } else {
      setCounts(EMPTY_COUNTS)
      setMeetings(0)
    }
    setLog([])
  }, [])

  useEffect(() => {
    if (userName) loadStats(userName, selectedDate)
  }, [userName, selectedDate, loadStats])

  // Debounced upsert to Supabase
  const scheduleSync = useCallback((nextCounts: Record<Category, number>, nextMeetings: number) => {
    if (!userName) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await supabase.from('daily_stats').upsert({
        user_name: userName,
        avatar,
        date: selectedDate,
        na_count: nextCounts.na,
        vm_count: nextCounts.vm,
        cb_count: nextCounts.cb,
        conn_count: nextCounts.conn,
        busy_count: nextCounts.busy,
        meetings: nextMeetings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_name,date' })
      setSaving(false)
      setLbRefresh(r => r + 1)
    }, 600)
  }, [userName, avatar, selectedDate])

  function change(key: Category, delta: number) {
    const cat = CATEGORIES.find(c => c.key === key)!
    setCounts(prev => {
      const next = { ...prev, [key]: Math.max(0, prev[key] + delta) }
      scheduleSync(next, meetings)
      return next
    })
    if (delta > 0) addLog(cat.label)
  }

  function changeMeeting(delta: number) {
    setMeetings(prev => {
      const next = Math.max(0, prev + delta)
      scheduleSync(counts, next)
      return next
    })
    if (delta > 0) {
      addLog('🌊 Booked meeting!')
      spawnHearts()
    }
  }

  function addLog(label: string) {
    const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setLog(prev => [{ label, t }, ...prev].slice(0, 8))
  }

  function spawnHearts() {
    const btn = document.getElementById('meetingPlusBtn')
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    for (let i = 0; i < 14; i++) {
      setTimeout(() => {
        const el = document.createElement('div')
        el.className = 'floatie'
        el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)]
        el.style.left = (cx + (Math.random() - 0.5) * 130) + 'px'
        el.style.top = cy + 'px'
        el.style.setProperty('--rot', (Math.random() - 0.5) * 60 + 'deg')
        el.style.fontSize = (16 + Math.random() * 18) + 'px'
        el.style.animationDuration = (1.1 + Math.random() * 0.6) + 's'
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 2000)
      }, i * 55)
    }
  }

  function resetAll() {
    if (!confirm(`Reset your tallies for ${isToday ? 'today' : selectedDate} to zero?`)) return
    setCounts(EMPTY_COUNTS)
    setMeetings(0)
    setLog([])
    if (userName) {
      supabase.from('daily_stats').upsert({
        user_name: userName,
        avatar,
        date: selectedDate,
        na_count: 0, vm_count: 0, cb_count: 0, conn_count: 0, busy_count: 0,
        meetings: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_name,date' }).then(() => setLbRefresh(r => r + 1))
    }
  }

  const total = totalAttempts({ na_count: counts.na, vm_count: counts.vm, cb_count: counts.cb, conn_count: counts.conn, busy_count: counts.busy })
  const connectRate = total > 0 ? `${Math.round((counts.conn / total) * 100)}%` : '—'
  const bookingRate = total > 0 ? `${Math.round((meetings / total) * 100)}% booking rate` : '— booking rate'
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (!userName) return <NamePrompt onConfirm={(name, av) => { setUserName(name); setAvatar(av) }} />

  return (
    <>
      {/* Marquee */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {[...ANIMALS, ...ANIMALS, ...ANIMALS, ...ANIMALS].map((a, i) => (
            <span key={i} style={{ animationDelay: `${Math.random() * 0.4}s` }}>{a}</span>
          ))}
        </div>
      </div>

      <div className="spacer-top" />

      <div className="page-outer">

        {/* Header — full width */}
        <header>
          <h1>Cold Call Club 📞</h1>
          <div className={`quote-display${quoteFade ? ' visible' : ''}`}>
            {QUOTES[quoteIdx]}
          </div>
          <div className="date-display" style={{ marginTop: 6 }}>{dateLabel} · {clock}</div>
          {saving && <div className="date-display" style={{ color: '#9ed0d0', marginTop: 2 }}>saving…</div>}
        </header>

        {/* Date tabs — full width */}
        <div className="date-tabs">
          {last7Days().map(d => (
            <button
              key={d}
              className={`date-tab${selectedDate === d ? ' active' : ''}`}
              onClick={() => setSelectedDate(d)}
            >
              {fmt(d)}
            </button>
          ))}
        </div>

        {/* Two columns */}
        <div className="two-col">
        <div className="main-col">

          {/* Tally grid */}
          <div className="tally-grid">
            {CATEGORIES.map(cat => (
              <div className="tally-card" key={cat.key}>
                <div className="tally-label">
                  <span className="dot" style={{ background: cat.dot }} />
                  {cat.label}
                </div>
                <div className="tally-count" style={{ color: cat.color }}>{counts[cat.key]}</div>
                <div className="btn-row">
                  <button className="tally-btn" onClick={() => change(cat.key, -1)}>−</button>
                  <button className="tally-btn plus-btn" onClick={() => change(cat.key, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Meetings */}
          <div className="meetings-card">
            <div>
              <div className="meetings-label">
                <span className="dot" style={{ background: '#1a9a9a' }} />
                Booked meetings
              </div>
              <div className="meetings-count">{meetings}</div>
              <div className="booking-rate">{bookingRate}</div>
            </div>
            <div className="btn-row" style={{ flexDirection: 'column', gap: 8 }}>
              <button id="meetingPlusBtn" className="meetings-plus" onClick={() => changeMeeting(1)}>+</button>
              <button className="tally-btn" style={{ width: 32, height: 32, fontSize: 18 }} onClick={() => changeMeeting(-1)}>−</button>
            </div>
          </div>

          {/* Summary */}
          <div className="summary">
            <div>
              <div className="stat-label">Total attempts</div>
              <div className="stat-value" style={{ color: '#0f6a6a' }}>{total}</div>
            </div>
            <div>
              <div className="stat-label">Connect rate</div>
              <div className="stat-value" style={{ color: '#0f6a6a' }}>{connectRate}</div>
            </div>
            <div>
              <div className="stat-label">Meetings</div>
              <div className="stat-value" style={{ color: '#0f6a6a' }}>{meetings}</div>
            </div>
            <button className="reset-btn" onClick={resetAll}>Reset</button>
          </div>

          {/* Log */}
          {(
            <div className="log-area">
              <div className="log-title">Recent activity</div>
              {log.length === 0
                ? <div className="log-empty">no entries yet ✨</div>
                : log.map((e, i) => (
                  <div className="log-entry" key={i}>
                    <span className="log-time">{e.t}</span>
                    <span>{e.label}</span>
                  </div>
                ))
              }
            </div>
          )}

          {/* Stats panel */}
          <StatsPanel userName={userName} />

          {/* Change name */}
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              className="reset-btn"
              onClick={() => { localStorage.removeItem('ct_user_name'); localStorage.removeItem('ct_user_avatar'); setUserName(null) }}
            >
              change name ({userName})
            </button>
          </div>

        </div>

          {/* Right sidebar — leaderboard */}
          <div className="side-col">
            <Leaderboard userName={userName} date={selectedDate} refreshKey={lbRefresh} />
          </div>

        </div>{/* end two-col */}
      </div>{/* end page-outer */}
    </>
  )
}
