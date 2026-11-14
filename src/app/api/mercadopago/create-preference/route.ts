import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { findPack } from '@/lib/referrals'
import { approvePurchase, createPendingPurchase, failPurchase } from '@/lib/purchases'
import { createCheckoutPreference } from '@/lib/mercadopago'

// POST /api/mercadopago/create-preference
// Body: { userId: string, packId: string }
//
// Reserva el descuento, crea la compra pendiente y devuelve el init_point
// de Checkout Pro para redirigir al usuario al pago.
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
      select: { id: true, email: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const origin =
      request.headers.get('origin') ||
      `${request.nextUrl.protocol}//${request.headers.get('host')}`

    // Reserva el descuento y crea la compra pendiente
    let purchase
    try {
      purchase = await createPendingPurchase(user.id, pack)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al preparar la compra'
      return NextResponse.json({ error: msg }, { status: 409 })
    }

    // Caso raro: el saldo cubrió el precio entre el render y el clic → sin pago
    if (purchase.finalPrice <= 0) {
      await approvePurchase(purchase)
      const updated = await db.user.findUnique({
        where: { id: user.id },
        select: { tokens: true, referralBalance: true },
      })
      return NextResponse.json({
        direct: true,
        purchase,
        tokens: updated?.tokens ?? 0,
        referralBalance: updated?.referralBalance ?? 0,
      })
    }

    try {
      const preference = await createCheckoutPreference({
        externalReference: purchase.id,
        title: `${pack.tokens} token${pack.tokens > 1 ? 's' : ''} — ${pack.label}`,
        unitPrice: purchase.finalPrice,
        payerEmail: user.email,
        backUrlsBase: origin,
        metadata: { userId: user.id, packId: pack.id },
      })

      await db.tokenPurchase.update({
        where: { id: purchase.id },
        data: { mpPreferenceId: preference.id },
      })

      return NextResponse.json({
        initPoint: preference.initPoint,
        preferenceId: preference.id,
        purchaseId: purchase.id,
        finalPrice: purchase.finalPrice,
        discount: purchase.discount,
      })
    } catch (err) {
      // MP falló: devuelve el descuento reservado y borra la compra pendiente
      await failPurchase(purchase)
      console.error('Error al crear preferencia de Mercado Pago:', err)
      const msg = err instanceof Error ? err.message : 'Error con Mercado Pago'
      return NextResponse.json({ error: `No se pudo iniciar el pago: ${msg}` }, { status: 502 })
    }
  } catch (error) {
    console.error('Error en create-preference:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
