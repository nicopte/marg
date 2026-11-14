import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { approvePurchase, failPurchase } from '@/lib/purchases'
import { MP_FAILED_STATUSES, searchPaymentsByReference } from '@/lib/mercadopago'

// POST /api/mercadopago/verify-payment
// Body: { userId: string }
//
// Para cada compra pendiente del usuario consulta a Mercado Pago los pagos
// asociados (external_reference = purchaseId) y acredita o falla la compra.
// Idempotente: puede llamarse las veces que haga falta.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const pending = await db.tokenPurchase.findMany({
      where: { userId: user.id, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    })

    let credited = 0
    let failed = 0
    let stillPending = 0

    for (const purchase of pending) {
      // Compra sin preferencia de MP (no debería existir): la dejamos estar
      if (!purchase.mpPreferenceId) {
        stillPending += 1
        continue
      }

      let payments
      try {
        payments = await searchPaymentsByReference(purchase.id)
      } catch (err) {
        // Si MP no responde, no tocamos nada (se reintenta en la próxima)
        console.error('Error consultando pagos de Mercado Pago:', err)
        stillPending += 1
        continue
      }

      const approved = payments.find((p) => p.status === 'approved')
      if (approved) {
        const ok = await approvePurchase(purchase, approved.id)
        if (ok) credited += 1
        continue
      }

      const rejected = payments.find((p) => MP_FAILED_STATUSES.includes(p.status))
      if (rejected) {
        const ok = await failPurchase(purchase)
        if (ok) failed += 1
        continue
      }

      // Sin pagos o aún en proceso
      stillPending += 1
    }

    const updated = await db.user.findUnique({
      where: { id: user.id },
      select: { tokens: true, referralBalance: true },
    })

    return NextResponse.json({
      verified: pending.length,
      credited,
      failed,
      stillPending,
      tokens: updated?.tokens ?? 0,
      referralBalance: updated?.referralBalance ?? 0,
    })
  } catch (error) {
    console.error('Error en verify-payment:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
