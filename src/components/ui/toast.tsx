"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  title?: string
  description?: string
  type?: ToastType
}

type ToastContextValue = {
  toast: (opts: { title?: string; description?: string; type?: ToastType }) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback(({ title, description, type = 'info' }: { title?: string; description?: string; type?: ToastType }) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((s) => [...s, { id, title, description, type }])
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'max-w-sm w-full rounded-md p-3 shadow-lg border',
              t.type === 'success' ? 'bg-green-50 border-green-200' : '',
              t.type === 'error' ? 'bg-red-50 border-red-200' : '',
              t.type === 'info' ? 'bg-slate-50 border-slate-200' : ''
            )}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                {t.title && <div className="font-medium">{t.title}</div>}
                {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
              </div>
              <button
                className="text-muted-foreground hover:opacity-80"
                onClick={() => remove(t.id)}
                aria-label="关闭通知"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

// auto-dismiss hook placed here to remove toasts after time
export function useToastAutoDismiss() {
  const ctx = useContext(ToastContext)
  useEffect(() => {
    if (!ctx) return
    // Not implemented globally here; consumers can control dismissal via remove button or unmount.
  }, [ctx])
}
