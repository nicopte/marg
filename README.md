# Mi Argentina — App con sistema de referidos

Aplicación web (Next.js 16 + Prisma + PostgreSQL) con registro de usuarios, DNI digital y un **sistema de referidos con descuentos en tokens**.

---

## 🎁 Sistema de referidos

| Regla | Valor |
|---|---|
| Código por usuario | 8 caracteres, único, generado al registrarse |
| Compartir | Link `https://tu-dominio/?ref=CODIGO` (autocompleta el código en el registro) |
| Recompensa al referidor | **10%** del precio pagado por cada compra de sus referidos |
| Se acredita como | **Saldo de descuento** (`referralBalance`), usable en la próxima compra de tokens |
| Tokens | Créditos internos para usar la app |

### Packs de tokens

| Pack | Tokens | Precio |
|---|---|---|
| Básico | 10 | $5.000 |
| Pro | 30 | $12.000 |
| Máximo | 100 | $30.000 |

El saldo de descuento se aplica automáticamente al comprar (hasta cubrir el 100% del precio).

### Modelos (Prisma)

- `User`: `referralCode`, `referredById`, `tokens`, `referralBalance`
- `TokenPurchase`: historial de compras (precio de lista, descuento, precio final)
- `ReferralReward`: recompensa generada por cada compra de un referido

### Endpoints

- `POST /api/auth/register` — acepta `referralCode`
- `GET /api/user/[id]` — wallet + stats de referidos + lista de referidos + historial de compras
- `POST /api/tokens/purchase` — `{ userId, packId }`, aplica descuento y acredita la recompensa

---

## 🛠 Desarrollo local

```bash
npm install            # genera el cliente Prisma (postinstall)
cp .env.example .env   # completá DATABASE_URL y DIRECT_URL
npx prisma db push     # crea/actualiza las tablas
npm run dev            # http://localhost:3000
```

Panel admin: tocá 3 veces el logo "miArgentina" en el home → contraseña `admin123`.

---

## 🚀 Deploy en GitHub + Vercel

### 1. GitHub

```bash
git init
git add .
git commit -m "Sistema de referidos + compra de tokens"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

### 2. Base de datos (obligatoria)

Creá una base **PostgreSQL gratis** y copiá la URL de conexión:

- [Neon](https://neon.tech) (recomendado) → botón *Generate* → copiá `DATABASE_URL` y `DIRECT_URL`
- [Supabase](https://supabase.com) → Project Settings → Database
- [Vercel Postgres](https://vercel.com/marketplace) → Create Database

### 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importá tu repo de GitHub
2. **Environment Variables** (Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | la URL de tu base (con `sslmode=require`) |
   | `DIRECT_URL` | la URL directa (si tu proveedor no distingue, la misma que arriba) |

3. **Deploy**

4. Después del primer deploy, aplicá el esquema contra la base de producción:

   ```bash
   DATABASE_URL="tu-url" npx prisma db push
   ```

5. Abrí la URL de Vercel (ej. `mi-argentina.vercel.app`) desde cualquier dispositivo.

### Notas

- `postinstall: prisma generate` corre solo en Vercel durante el build.
- El build usa `output: "standalone"`; funciona igual en Vercel.
- Los `.env` **nunca** se suben a Git (están en `.gitignore`).
