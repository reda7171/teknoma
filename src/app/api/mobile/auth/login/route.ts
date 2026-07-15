import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_riwaya_mobile_key_2026';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identifiant ou mot de passe manquant' }, { status: 400 });
    }

    // Find customer by email or phone
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, customer.password);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: customer.id, email: customer.email, role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      message: 'Login successful',
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
      }
    });

  } catch (error: any) {
    console.error('Mobile Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
