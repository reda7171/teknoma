import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '@/lib/jwt-secret';

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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let customer;

    if (existingCustomer) {
      if (existingCustomer.password) {
        return NextResponse.json({ error: 'Ce numéro de téléphone ou cet email est déjà utilisé par un compte actif. Veuillez vous connecter.' }, { status: 409 });
      } else {
        // Le compte a été créé lors d'une commande COD (pas de mot de passe) -> On le met à jour
        customer = await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            password: hashedPassword,
            fullName,
            email: email || existingCustomer.email,
          },
        });
      }
    } else {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          email: email || null,
          password: hashedPassword,
          fullName,
          phone: phone || '', // Phone is required in schema
        },
      });
    }

    // Generate a welcome coupon
    try {
      const couponCode = `BIENVENUE-${Math.random().toString(36).substring(2,6).toUpperCase()}${customer.id.substring(0,4).toUpperCase()}`
      await prisma.coupon.create({
          data: {
              code: couponCode,
              discount: 10,
              type: 'FIXED_AMOUNT',
              isActive: true,
          }
      })
    } catch (err) {
      console.error('Failed to create welcome gift', err)
    }

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
