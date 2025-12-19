"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ImageEditor from '@/components/image/ImageEditor'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function EditorPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [imageUrl, setImageUrl] = useState('')

  // middleware 已经处理了认证，这里直接加载图片
  useEffect(() => {
    setImageUrl(`/api/images/${params.id}/file?size=original`)
  }, [params.id])

  const onSaved = () => {
    // after save, redirect back to gallery
    router.push('/gallery')
  }

  const rename = async () => {
    const title = prompt('新名称')
    if (!title) return
    try {
      const res = await fetch(`/api/images/${params.id}`, { method: 'PATCH', body: JSON.stringify({ title }) })
      const data = await res.json()
      if (res.ok) alert('重命名成功')
      else alert('重命名失败: ' + (data.error || ''))
    } catch (err) {
      console.error(err)
      alert('重命名失败')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">图片编辑</h1>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/gallery')}>返回画廊</Button>
          <Button onClick={rename}>重命名</Button>
        </div>
      </div>

      <ImageEditor imageUrl={imageUrl} onSaved={onSaved} />
    </div>
  )
}
