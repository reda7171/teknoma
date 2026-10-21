import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '@/lib/jwt-secret';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ bookId: string; reviewId: string }> }
) {
  const { reviewId } = await params;

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return NextResponse.json({ error: 'Avis introuvable' }, { status: 404 });
    }

    if (review.customerId !== decoded.id) {
      return NextResponse.json({ error: 'Non autorisé à modifier cet avis' }, { status: 403 });
    }

    const body = await req.json();
    const { rating, comment } = body;

    if (!rating || !comment) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: Number(rating),
        comment,
      },
    });

    return NextResponse.json({ success: true, review: updatedReview });
  } catch (error) {
    console.error('Mobile API Error - Put Review:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ bookId: string; reviewId: string }> }
) {
  const { reviewId } = await params;

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return NextResponse.json({ error: 'Avis introuvable' }, { status: 404 });
    }

    if (review.customerId !== decoded.id) {
      return NextResponse.json({ error: 'Non autorisé à supprimer cet avis' }, { status: 403 });
    }

    await prisma.review.delete({
      where: { id: reviewId }
    });

    return NextResponse.json({ success: true, message: 'Avis supprimé' });
  } catch (error) {
    console.error('Mobile API Error - Delete Review:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
