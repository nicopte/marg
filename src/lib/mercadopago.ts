// ========================================
// Mercado Pago — Checkout Pro (REST API)
// ========================================

const MP_API = 'https://api.mercadopago.com';

export function getMpAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MP_ACCESS_TOKEN no configurado');
  }
  return token;
}

async function mpFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getMpAccessToken()}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
}

export interface CheckoutPreferenceResult {
  id: string;
  initPoint: string;
}

/**
 * Crea una preferencia de Checkout Pro con un único item.
 * `backUrlsBase` es el origin de la app (ej. https://marg-pi.vercel.app):
 * Mercado Pago redirige a `${base}/?payment=success|failure|pending`.
 */
export async function createCheckoutPreference(opts: {
  externalReference: string;
  title: string;
  unitPrice: number;
  payerEmail?: string;
  backUrlsBase: string;
  metadata?: Record<string, string>;
}): Promise<CheckoutPreferenceResult> {
  const isHttps = opts.backUrlsBase.startsWith('https://');

  const body = {
    items: [
      {
        id: opts.externalReference,
        title: opts.title,
        quantity: 1,
        unit_price: opts.unitPrice,
        currency_id: 'ARS',
      },
    ],
    payer: opts.payerEmail ? { email: opts.payerEmail } : undefined,
    external_reference: opts.externalReference,
    back_urls: {
      success: `${opts.backUrlsBase}/?payment=success`,
      failure: `${opts.backUrlsBase}/?payment=failure`,
      pending: `${opts.backUrlsBase}/?payment=pending`,
    },
    // Mercado Pago exige back_urls https para auto_return (en local http
    // rechaza la preferencia con "invalid_auto_return")
    ...(isHttps ? { auto_return: 'approved' as const } : {}),
    statement_descriptor: 'MI ARGENTINA',
    metadata: opts.metadata,
  };

  const res = await mpFetch('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Mercado Pago respondió ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { id: string; init_point: string };
  if (!data.init_point) throw new Error('Mercado Pago no devolvió init_point');
  return { id: data.id, initPoint: data.init_point };
}

export interface MpPayment {
  id: string | number;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
}

/** Pagos asociados a una referencia (nuestro purchaseId). */
export async function searchPaymentsByReference(externalReference: string): Promise<MpPayment[]> {
  const res = await mpFetch(
    `/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}`
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Mercado Pago respondió ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { results?: MpPayment[] };
  return data.results ?? [];
}

/** Estados que significan que el pago no se concretó. */
export const MP_FAILED_STATUSES = ['rejected', 'cancelled', 'refunded', 'charged_back'];
