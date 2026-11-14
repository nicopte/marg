import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { findPack } from '@/lib/referrals'
import { approvePurchase, createPendingPurchase, failPurchase } from '@/lib/purchases'

// POST /api/tokens/purchase
// Body: { userId: string, packId: string }
//
// Compra SIN pago: solo se permite cuando el saldo de descuento por referidos
// cubre el 100% del precio del pack (finalPrice === 0).
// Si queda saldo por pagar, responde 402 y el cliente debe iniciar el pago
// con Mercado Pago mediante POST /api/mercadopago/create-preference.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, packId } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    const pack = findPack(packId)
    if (!pack) {
      return NextResponse.json({ error: 'Pack de tokens no válido' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, referralBalance: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Sin saldo suficiente para cubrir el precio → requiere Mercado Pago
    // (se responde antes de crear ningún registro)
    if (Math.min(Math.max(0, user.referralBalance), pack.price) < pack.price) {
      return NextResponse.json(
        {
          error: 'Este pack requiere pago con Mercado Pago',
          code: 'payment_required',
        },
        { status: 402 }
      )
    }

    // Reserva el descuento y arma la compra pendiente
    const purchase = await createPendingPurchase(user.id, pack)

    // Carrera: el saldo cambió entre la lectura y la creación → devolver saldo
    if (purchase.finalPrice > 0) {
      await failPurchase(purchase)
      return NextResponse.json(
        {
          error: 'Este pack requiere pago con Mercado Pago',
          code: 'payment_required',
        },
        { status: 402 }
      )
    }

    // Descuento cubre todo: acredita sin pago
    await approvePurchase(purchase)

    const updated = await db.user.findUnique({
      where: { id: user.id },
      select: { tokens: true, referralBalance: true },
    })

    return NextResponse.json(
      {
        message: 'Compra realizada exitosamente',
        purchase,
        tokens: updated?.tokens ?? pack.tokens,
        referralBalance: updated?.referralBalance ?? 0,
        referralRewardGenerated: 0,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en compra de tokens:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
