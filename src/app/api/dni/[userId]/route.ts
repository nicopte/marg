import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/dni/[userId] — el usuario edita los datos del documento cuando quiera
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { nombre, apellido, dniNumero, domicilio, nacimiento, fechaEmision, sexo, firma, foto } = body

    const requiredFields: Record<string, unknown> = {
      nombre,
      apellido,
      dniNumero,
      domicilio,
      nacimiento,
      fechaEmision,
      sexo,
    }
    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value || (typeof value === 'string' && value.trim() === ''))
      .map(([key]) => key)

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Campos requeridos faltantes: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    if (typeof dniNumero !== 'string' || !/^\d{7,8}$/.test(dniNumero.trim())) {
      return NextResponse.json(
        { error: 'El número de DNI debe tener 7 u 8 dígitos' },
        { status: 400 }
      )
    }

    const existing = await db.dniData.findUnique({ where: { userId } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Datos de DNI no encontrados para este usuario' },
        { status: 404 }
      )
    }

    const dni = await db.dniData.update({
      where: { userId },
      data: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dniNumero: dniNumero.trim(),
        domicilio: domicilio.trim(),
        nacimiento,
        fechaEmision,
        sexo,
        // firma/foto opcionales: si no vienen en el body se conservan las actuales
        ...(typeof firma === 'string' ? { firma: firma || null } : {}),
        ...(typeof foto === 'string' ? { foto: foto || null } : {}),
        userId_value: dniNumero.trim(), // el DNI que se muestra en el documento
      },
    })

    return NextResponse.json({ dni }, { status: 200 })
  } catch (error) {
    console.error('Error al actualizar datos de DNI:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      )
    }

    const dniData = await db.dniData.findUnique({
      where: { userId },
    })

    if (!dniData) {
      return NextResponse.json(
        { error: 'Datos de DNI no encontrados para este usuario' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { dni: dniData },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error al obtener datos de DNI:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
