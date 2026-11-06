// ========================================
// Sistema de referidos y packs de tokens
// ========================================

/** % del precio pagado por un referido que se acredita como saldo de descuento al referidor */
export const REFERRAL_REWARD_PERCENT = 10;

export interface TokenPack {
  id: string;
  label: string;
  description: string;
  tokens: number;
  price: number; // ARS
  popular?: boolean;
}

export const TOKEN_PACKS: TokenPack[] = [
  {
    id: 'starter',
    label: 'Pack Básico',
    description: 'Para probar la app',
    tokens: 10,
    price: 5000,
  },
  {
    id: 'pro',
    label: 'Pack Pro',
    description: 'El más elegido',
    tokens: 30,
    price: 12000,
    popular: true,
  },
  {
    id: 'max',
    label: 'Pack Máximo',
    description: 'Para uso intensivo',
    tokens: 100,
    price: 30000,
  },
];

export function findPack(packId: string): TokenPack | undefined {
  return TOKEN_PACKS.find((p) => p.id === packId);
}

/** Alfabeto sin caracteres ambiguos (0/O, 1/I/L) */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export function generateReferralCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeReferralCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

/** Formatea montos en pesos argentinos: 5000 -> "$5.000" */
export function formatARS(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-AR');
}
