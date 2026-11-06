import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/users - List all users with their activation status
export async function GET(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key')

    if (adminKey !== 'admin123') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        dni: {
          select: {
            nombre: true,
            apellido: true,
            dniNumero: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users }, { status: 200 })
  } catch (error) {
    console.error('Error al listar usuarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
