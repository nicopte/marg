// ========================================
// Lógica de compras de tokens
// (uso compartido por el endpoint directo y la verificación de MP)
// ========================================
import { db } from '@/lib/db';
import { REFERRAL_REWARD_PERCENT, type TokenPack } from '@/lib/referrals';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** Redondea a 2 decimales (como el flujo original de referidos). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Crea una compra en estado "pending" reservando el saldo de descuento
 * (se descuenta de una vez para que no pueda usarse en otra compra).
 * Si el descuento cubre el precio completo, finalPrice queda en 0.
 */
export async function createPendingPurchase(userId: string, pack: TokenPack) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { referralBalance: true },
    });
    if (!user) throw new Error('Usuario no encontrado');

    const discount = Math.min(Math.max(0, user.referralBalance), pack.price);

    if (discount > 0) {
      // Guarda de concurrencia: solo descuenta si sigue teniendo el saldo
      const reserved = await tx.user.updateMany({
        where: { id: userId, referralBalance: { gte: discount } },
        data: { referralBalance: { decrement: discount } },
      });
      if (reserved.count === 0) throw new Error('Saldo de descuento insuficiente');
    }

    return tx.tokenPurchase.create({
      data: {
        userId,
        packId: pack.id,
        packLabel: pack.label,
        tokens: pack.tokens,
        listPrice: pack.price,
        discount,
        finalPrice: pack.price - discount,
        status: 'pending',
      },
    });
  });
}

/**
 * Acredita una compra aprobada: suma los tokens y, si corresponde,
 * la recompensa del 10% al referidor.
 * Idempotente: solo transiciona de "pending" a "approved" una vez.
 */
export async function approvePurchase(
  purchase: { id: string; userId: string; tokens: number; finalPrice: number },
  mpPaymentId?: string
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const updated = await tx.tokenPurchase.updateMany({
      where: { id: purchase.id, status: 'pending' },
      data: { status: 'approved', ...(mpPaymentId ? { mpPaymentId: String(mpPaymentId) } : {}) },
    });
    if (updated.count === 0) return false; // ya fue acreditada

    await tx.user.update({
      where: { id: purchase.userId },
      data: { tokens: { increment: purchase.tokens } },
    });

    // Recompensa al referidor sobre lo realmente pagado
    if (purchase.finalPrice > 0) {
      const buyer = await tx.user.findUnique({
        where: { id: purchase.userId },
        select: { referredById: true },
      });
      if (buyer?.referredById) {
        const amount = round2(purchase.finalPrice * (REFERRAL_REWARD_PERCENT / 100));
        await tx.user.update({
          where: { id: buyer.referredById },
          data: { referralBalance: { increment: amount } },
        });
        await tx.referralReward.create({
          data: { referrerId: buyer.referredById, purchaseId: purchase.id, amount },
        });
      }
    }

    return true;
  });
}

/**
 * Marca una compra pendiente como fallida y devuelve el descuento reservado.
 * Idempotente: solo transiciona de "pending" a "failed" una vez.
 */
export async function failPurchase(purchase: {
  id: string;
  userId: string;
  discount: number;
}): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const updated = await tx.tokenPurchase.updateMany({
      where: { id: purchase.id, status: 'pending' },
      data: { status: 'failed' },
    });
    if (updated.count === 0) return false;

    if (purchase.discount > 0) {
      await tx.user.update({
        where: { id: purchase.userId },
        data: { referralBalance: { increment: purchase.discount } },
      });
    }
    return true;
  });
}
