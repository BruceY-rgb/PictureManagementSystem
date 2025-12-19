import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().max(100),
  password: z.string().min(6).max(100),
  nickname: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // 验证输入数据
    const validatedData = registerSchema.parse(body)

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
    })

    if (existingUsername) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: '邮箱已被注册' },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        nickname: validatedData.nickname || validatedData.username,
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        message: '注册成功',
        user,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据无效', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: '注册失败,请稍后重试' },
      { status: 500 }
    )
  }
}
