"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function TagEditDialog({ open, onOpenChange, tag, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; tag: any | null; onSaved?: (tag: any) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('')

  useEffect(() => {
    setName(tag?.name || '')
    setColor(tag?.color || '')
  }, [tag])

  const save = async () => {
    if (!tag) return
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: 'PATCH', body: JSON.stringify({ name, color }) })
      const data = await res.json()
      if (res.ok) {
        onSaved && onSaved(data.tag)
        onOpenChange(false)
      } else {
        alert(data.error || '更新失败')
      }
    } catch (err) {
      console.error(err)
      alert('更新失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑标签</DialogTitle>
          <DialogDescription>修改自定义标签的名称和颜色</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <Input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="标签名称" />
          <Input value={color} onChange={(e) => setColor((e.target as HTMLInputElement).value)} placeholder="#RRGGBB 或 颜色名称" />
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={save}>保存</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TagEditDialog
