import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { findPack, REFERRAL_REWARD_PERCENT } from '@/lib/referrals'

// POST /api/tokens/purchase
// Body: { userId: string, packId: string }
// Aplica el saldo de descuento acumulado por referidos y acredita los tokens.
// Además acredita al referidor un % del precio realmente pagado.
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
      select: { id: true, referralBalance: true, referredById: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Descuento: todo el saldo disponible, sin superar el precio del pack
    const balance = Math.max(0, user.referralBalance)
    const discount = Math.min(balance, pack.price)
    const finalPrice = pack.price - discount

    // % que gana el referidor por esta compra (solo si hubo pago real)
    const rewardAmount =
      user.referredById && finalPrice > 0
        ? Math.round(finalPrice * (REFERRAL_REWARD_PERCENT / 100) * 100) / 100
        : 0

    const purchase = await db.$transaction(async (tx) => {
      const created = await tx.tokenPurchase.create({
        data: {
          userId: user.id,
          packId: pack.id,
          packLabel: pack.label,
          tokens: pack.tokens,
          listPrice: pack.price,
          discount,
          finalPrice,
        },
      })

      // Descontar saldo y acreditar tokens al comprador
      await tx.user.update({
        where: { id: user.id },
        data: {
          tokens: { increment: pack.tokens },
          referralBalance: { decrement: discount },
        },
      })

      // Acreditar la recompensa al referidor
      if (rewardAmount > 0 && user.referredById) {
        await tx.user.update({
          where: { id: user.referredById },
          data: { referralBalance: { increment: rewardAmount } },
        })

        await tx.referralReward.create({
          data: {
            referrerId: user.referredById,
            purchaseId: created.id,
            amount: rewardAmount,
          },
        })
      }

      return created
    })

    // Estado actualizado del comprador
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
        referralRewardGenerated: rewardAmount,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en compra de tokens:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
