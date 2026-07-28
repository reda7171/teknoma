import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const { id } = await params;
    const body = await request.json();
    const { currentPage, status } = body;

    const currentEntry = await prisma.readingList.findUnique({
      where: { id }
    });

    if (!currentEntry) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }

    if (currentEntry.customerId !== decoded.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const updateData: any = {};
    if (currentPage !== undefined) {
      updateData.currentPage = Math.min(currentPage, currentEntry.totalPages);
      updateData.status = updateData.currentPage >= currentEntry.totalPages ? 'COMPLETED' : 'READING';
    }
    if (status) {
      updateData.status = status;
    }
    if (updateData.status === 'COMPLETED' && currentEntry.status !== 'COMPLETED') {
      updateData.finishedAt = new Date();
    }
    if (updateData.status === 'READING' && currentEntry.status === 'TO_READ') {
      updateData.startedAt = new Date();
    }

    const updated = await prisma.readingList.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update reading list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const { id } = await params;

    const currentEntry = await prisma.readingList.findUnique({
      where: { id }
    });

    if (!currentEntry) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }

    if (currentEntry.customerId !== decoded.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    await prisma.readingList.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete reading list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
