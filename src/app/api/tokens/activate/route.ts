import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Horas de acceso al DNI que otorga cada token activado
export const TOKEN_ACCESS_HOURS = 22

// POST /api/tokens/activate
// Body: { userId: string }
//
// Consume 1 token y extiende el acceso al DNI en 22 horas.
// Si ya hay tiempo restante, se suman las 22 h encima (no se pierde nada).
// Además activa la cuenta (por si el usuario aún no la tiene activa).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { tokens: true, accessUntil: true },
      })
      if (!user) return { error: 'Usuario no encontrado', status: 404 }

      if (user.tokens < 1) {
        return { error: 'No tenés tokens disponibles. Comprá tokens para activar.', status: 402 }
      }

      // Arranca desde el momento actual o desde el vencimiento, lo que sea mayor
      const now = new Date()
      const base =
        user.accessUntil && user.accessUntil.getTime() > now.getTime()
          ? user.accessUntil
          : now
      const accessUntil = new Date(base.getTime() + TOKEN_ACCESS_HOURS * 60 * 60 * 1000)

      const updated = await tx.user.updateMany({
        where: { id: userId, tokens: { gte: 1 } },
        data: {
          tokens: { decrement: 1 },
          accessUntil,
          isActive: true,
        },
      })
      if (updated.count === 0) {
        return { error: 'No tenés tokens disponibles. Comprá tokens para activar.', status: 402 }
      }

      const after = await tx.user.findUnique({
        where: { id: userId },
        select: { tokens: true, accessUntil: true, isActive: true },
      })
      return {
        message: `DNI activo por ${TOKEN_ACCESS_HOURS} horas`,
        accessUntil: after?.accessUntil ?? accessUntil,
        tokens: after?.tokens ?? user.tokens - 1,
        isActive: after?.isActive ?? true,
        status: 200,
      }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error al activar token:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
