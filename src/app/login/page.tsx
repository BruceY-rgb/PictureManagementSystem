'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageIcon } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const registered = searchParams.get('registered')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        return
      }

      // 登录成功,跳转到首页
      router.push('/')
      router.refresh()
    } catch (err) {
      setError('登录失败,请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <ImageIcon className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center">欢迎回来</CardTitle>
        <CardDescription className="text-center">
          登录您的图片管理系统账户
        </CardDescription>
      </CardHeader>
      <CardContent>
        {registered && (
          <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 rounded-md">
            注册成功!请登录您的账户
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="请输入邮箱"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">密码</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                忘记密码?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="请输入密码"
              {...register('password')}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '登录中...' : '登录'}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-center w-full text-muted-foreground">
          还没有账户?{' '}
          <Link href="/register" className="text-primary hover:underline">
            立即注册
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            加载中...
          </CardContent>
        </Card>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
