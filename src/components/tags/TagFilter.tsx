"use client"

import React from 'react'
import { Input } from '@/components/ui/input'

export function TagFilter({ search, setSearch, type, setType, sort, setSort }: { search: string; setSearch: (s: string) => void; type: string; setType: (t: string) => void; sort: string; setSort: (s: string) => void }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <Input value={search} onChange={(e) => setSearch((e.target as HTMLInputElement).value)} placeholder="搜索标签" />
      <select className="h-10 rounded-md border px-2" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="">全部</option>
        <option value="AUTO_EXIF">EXIF自动</option>
        <option value="AUTO_AI">AI智能</option>
        <option value="CUSTOM">自定义</option>
      </select>
      <select className="h-10 rounded-md border px-2" value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="useCount_desc">使用次数 ↓</option>
        <option value="useCount_asc">使用次数 ↑</option>
        <option value="name_asc">名称 A→Z</option>
        <option value="name_desc">名称 Z→A</option>
        <option value="createdAt_desc">创建时间 ↓</option>
        <option value="createdAt_asc">创建时间 ↑</option>
      </select>
    </div>
  )
}

export default TagFilter
