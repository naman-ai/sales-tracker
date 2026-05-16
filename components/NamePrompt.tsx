'use client'
import { useState, useEffect, KeyboardEvent } from 'react'

const EMOJIS = [
  // animals
  '🐱','🐶','🦊','🐸','🐧','🦄','🐺','🦁','🐻','🦝',
  '🐨','🐯','🦋','🐙','🦜','🦔','🐬','🦭','🐮','🐷',
  // food
  '🍕','🍔','🌮','🍩','🧁','🍓','🥑','🍣','🍜','🎂',
  // transport
  '🚗','🚀','🏎️','🚂','✈️','🛸','🚁','⛵','🏍️','🚲',
  // fun objects
  '👑','💎','🎯','🎸','🌈','⚡','🔥','🎪','🧲','🪄',
]

function randomEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
}

interface Props {
  onConfirm: (name: string, avatar: string) => void
}

export default function NamePrompt({ onConfirm }: Props) {
  const [value, setValue] = useState('')
  const [avatar, setAvatar] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setAvatar(randomEmoji())
    setMounted(true)
  }, [])

  if (!mounted) return null

  function submit() {
    const name = value.trim()
    if (!name) return
    localStorage.setItem('ct_user_name', name)
    localStorage.setItem('ct_user_avatar', avatar)
    onConfirm(name, avatar)
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className="name-overlay">
      <div className="name-card">
        <h2>Call Tally 🌊</h2>
        <p>Pick your avatar and enter your name to join the leaderboard.</p>

        <div className="avatar-preview">{avatar}</div>

        <div className="emoji-grid">
          {EMOJIS.map(e => (
            <button
              key={e}
              className={`emoji-btn${avatar === e ? ' selected' : ''}`}
              onClick={() => setAvatar(e)}
            >
              {e}
            </button>
          ))}
        </div>

        <button className="shuffle-btn" onClick={() => setAvatar(randomEmoji())}>
          shuffle ✦
        </button>

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
