import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { generateReferralCode } from '@/lib/referrals'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      )
    }

    let user = await db.user.findUnique({
      where: { id },
      include: {
        dni: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Usuarios creados antes del sistema de referidos: generarle su código
    if (!user.referralCode) {
      let code = generateReferralCode()
      for (let i = 0; i < 5; i++) {
        const taken = await db.user.findUnique({ where: { referralCode: code } })
        if (!taken) break
        code = generateReferralCode()
      }
      user = await db.user.update({
        where: { id },
        data: { referralCode: code },
        include: { dni: true },
      })
    }

    // ===== Referidos del usuario =====
    const referrals = await db.user.findMany({
      where: { referredById: user.id },
      select: {
        id: true,
        email: true,
        createdAt: true,
        tokens: true,
        dni: { select: { nombre: true, apellido: true } },
        purchases: {
          select: { id: true, finalPrice: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Recompensas totales generadas, agrupadas por referido que las produjo
    const rewards = await db.referralReward.findMany({
      where: { referrerId: user.id },
      select: { amount: true, purchase: { select: { userId: true } } },
    })
    const earnedByUser = new Map<string, number>()
    let totalRewards = 0
    for (const r of rewards) {
      totalRewards += r.amount
      earnedByUser.set(
        r.purchase.userId,
        (earnedByUser.get(r.purchase.userId) || 0) + r.amount
      )
    }

    const referralList = referrals.map((r) => {
      const spent = r.purchases.reduce((acc, p) => acc + p.finalPrice, 0)
      return {
        id: r.id,
        email: r.email,
        name: r.dni ? `${r.dni.nombre} ${r.dni.apellido}` : null,
        createdAt: r.createdAt,
        tokens: r.tokens,
        purchasesCount: r.purchases.length,
        spent,
        earned: Math.round((earnedByUser.get(r.id) || 0) * 100) / 100,
      }
    })

    // ===== Compras del usuario =====
    const purchases = await db.tokenPurchase.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        packId: true,
        packLabel: true,
        tokens: true,
        listPrice: true,
        discount: true,
        finalPrice: true,
        createdAt: true,
      },
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        user: userWithoutPassword,
        wallet: {
          tokens: user.tokens,
          referralBalance: user.referralBalance,
          referralCode: user.referralCode,
        },
        referralStats: {
          referralCount: referralList.length,
          purchasesCount: referralList.reduce((acc, r) => acc + r.purchasesCount, 0),
          totalRewards: Math.round(totalRewards * 100) / 100,
        },
        referrals: referralList,
        purchases,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
