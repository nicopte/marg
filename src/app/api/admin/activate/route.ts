import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/activate - Activate or deactivate a user
export async function POST(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key')

    if (adminKey !== 'admin123') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { userId, isActive } = await request.json()

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'userId (string) e isActive (boolean) son requeridos' },
        { status: 400 }
      )
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { isActive },
      include: { dni: true },
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        message: isActive ? 'Cuenta activada exitosamente' : 'Cuenta desactivada',
        user: userWithoutPassword,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error al activar usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
