'use client'
import { useState, useEffect, KeyboardEvent } from 'react'

interface Props {
  onConfirm: (name: string) => void
}

export default function NamePrompt({ onConfirm }: Props) {
  const [value, setValue] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  function submit() {
    const name = value.trim()
    if (!name) return
    localStorage.setItem('ct_user_name', name)
    onConfirm(name)
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className="name-overlay">
      <div className="name-card">
        <h2>Call Tally 🌊</h2>
        <p>Enter your name to track your calls and join the leaderboard.</p>
        <input
          className="name-input"
          type="text"
          placeholder="your name"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKey}
          autoFocus
        />
        <button className="name-submit" onClick={submit} disabled={!value.trim()}>
          let&apos;s go →
        </button>
      </div>
    </div>
  )
}
