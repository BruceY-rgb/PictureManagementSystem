"use client"

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type TagOption = { id: string; name: string }

export function TagInput({ value = [], onChange }: { value?: TagOption[]; onChange: (v: TagOption[]) => void }) {
  const [text, setText] = useState('')
  const [suggests, setSuggests] = useState<TagOption[]>([])

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!text) return setSuggests([])
      try {
        const res = await fetch(`/api/tags?search=${encodeURIComponent(text)}&sort=useCount_desc`)
        const data = await res.json()
        if (res.ok) setSuggests(data.tags || [])
      } catch (err) {
        // ignore
      }
    }, 250)
    return () => clearTimeout(handler)
  }, [text])

  const add = async (t: TagOption | string) => {
    if (typeof t === 'string') {
      // create tag
      try {
        const res = await fetch('/api/tags', { method: 'POST', body: JSON.stringify({ name: t }) })
        const data = await res.json()
        if (res.ok) {
          onChange([...value, { id: data.tag.id, name: data.tag.name }])
        }
      } catch (err) {
        console.error(err)
      }
    } else {
      if (!value.find((v) => v.id === t.id)) onChange([...value, t])
    }
    setText('')
    setSuggests([])
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText((e.target as HTMLInputElement).value)} placeholder="添加标签或搜索" />
        <Button onClick={() => text && add(text)} disabled={!text}>添加</Button>
      </div>
      {suggests.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {suggests.map((s) => (
            <button key={s.id} className="p-2 border rounded" onClick={() => add(s)}>{s.name}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default TagInput
