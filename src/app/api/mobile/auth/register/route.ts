import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_riwaya_mobile_key_2026';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, fullName, phone } = body;

    if (!password || !fullName || (!email && !phone)) {
      return NextResponse.json({ error: 'Missing required fields (email or phone, and password)' }, { status: 400 });
    }

    // Check if customer exists by phone or email
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: email || 'NONE' },
          { phone: phone || 'NONE' },
        ],
      },
    });

    if (existingCustomer) {
      return NextResponse.json({ error: 'Ce numéro de téléphone ou cet email est déjà utilisé' }, { status: 409 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        email: email || null,
        password: hashedPassword,
        fullName,
        phone: phone || '', // Phone is required in schema
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { id: customer.id, email: customer.email, role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      message: 'Account created successfully',
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Mobile Register Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
