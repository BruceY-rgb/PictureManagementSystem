"use client"

import { useEffect, useState } from 'react'
import { TagFilter } from '@/components/tags/TagFilter'
import TagBadge from '@/components/tags/TagBadge'
import TagEditDialog from '@/components/tags/TagEditDialog'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Search } from 'lucide-react'

type Tag = {
  id: string
  name: string
  type: string
  color?: string | null
  useCount: number
  createdAt: string
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState('useCount_desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editTag, setEditTag] = useState<Tag | null>(null)
  const { toast } = useToast()

  const fetchTags = async () => {
    try {
      const q = new URLSearchParams()
      if (type) q.set('type', type)
      if (sort) q.set('sort', sort)
      q.set('search', search)  // 移除 if 条件，确保搜索清空时也能触发更新
      const res = await fetch('/api/tags?' + q.toString())
      const data = await res.json()
      if (res.ok) setTags(data.tags || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchTags()
  }, [search, type, sort])

  const createTag = async () => {
    const name = prompt('新标签名称')
    if (!name) return
    try {
      const res = await fetch('/api/tags', { method: 'POST', body: JSON.stringify({ name }) })
      const data = await res.json()
      if (res.ok) {
        toast({ title: '创建成功', description: data.tag.name, type: 'success' })
        fetchTags()
      } else {
        toast({ title: '创建失败', description: data.error || '未知错误', type: 'error' })
      }
    } catch (err) {
      console.error(err)
      toast({ title: '创建失败', type: 'error' })
    }
  }

  const removeTag = async (id: string) => {
    if (!confirm('确定删除该标签？此操作会从所有图片中移除该标签。')) return
    try {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast({ title: '删除成功', description: `${data.affected || 0} 张图片受影响`, type: 'success' })
        fetchTags()
      } else {
        toast({ title: '删除失败', description: data.error || '未知错误', type: 'error' })
      }
    } catch (err) {
      console.error(err)
      toast({ title: '删除失败', type: 'error' })
    }
  }

  const bulkDelete = async () => {
    if (selected.size === 0) return alert('请先选择要删除的标签')
    if (!confirm('确认删除选中的自定义标签？')) return
    for (const id of Array.from(selected)) {
      await removeTag(id)
    }
    setSelected(new Set())
  }

  const grouped = tags.reduce((acc: Record<string, Tag[]>, t) => {
    acc[t.type] = acc[t.type] || []
    acc[t.type].push(t)
    return acc
  }, {})

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">标签管理</h1>
        <div className="flex gap-2">
          <Button onClick={createTag}>新建标签</Button>
          <Button variant="destructive" onClick={bulkDelete}>批量删除</Button>
        </div>
      </div>

      <TagFilter search={search} setSearch={setSearch} type={type} setType={setType} sort={sort} setSort={setSort} />

      <div className="my-4">
        <div className="text-sm text-muted-foreground">
          {search ? (
            <>
              找到 <strong>{tags.length}</strong> 个匹配 &ldquo;{search}&rdquo; 的标签
              {tags.length === 0 && (
                <Button
                  variant="link"
                  className="ml-2"
                  onClick={() => setSearch('')}
                >
                  清除搜索
                </Button>
              )}
            </>
          ) : (
            <>共 {tags.length} 个标签</>
          )}
        </div>
      </div>

      {/* 无结果时的提示 */}
      {search && tags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">未找到匹配的标签</h2>
          <p className="text-muted-foreground mb-4">
            没有标签名称包含 &ldquo;{search}&rdquo;
          </p>
          <Button variant="outline" onClick={() => setSearch('')}>
            清除搜索条件
          </Button>
        </div>
      )}

      {['AUTO_EXIF', 'AUTO_AI', 'CUSTOM'].map((k) => (
        <div key={k} className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{k === 'AUTO_EXIF' ? 'EXIF自动标签' : k === 'AUTO_AI' ? 'AI智能标签' : '自定义标签'}</h2>
          <div className="flex flex-wrap gap-2">
            {(grouped[k] || []).map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <input type="checkbox" checked={selected.has(t.id)} onChange={(e) => {
                  const s = new Set(selected)
                  if ((e.target as HTMLInputElement).checked) s.add(t.id)
                  else s.delete(t.id)
                  setSelected(s)
                }} />
                <div onClick={() => window.location.href = `/tags/${t.id}`} className="cursor-pointer">
                  <TagBadge id={t.id} name={t.name} type={t.type} color={t.color} count={t.useCount} onRemove={t.type === 'CUSTOM' ? () => removeTag(t.id) : undefined} />
                </div>
                {t.type === 'CUSTOM' && <Button variant="outline" onClick={() => setEditTag(t)}>编辑</Button>}
              </div>
            ))}
          </div>
        </div>
      ))}

      <TagEditDialog open={!!editTag} onOpenChange={(v) => { if (!v) setEditTag(null) }} tag={editTag} onSaved={() => { fetchTags(); setEditTag(null) }} />
    </div>
  )
}
