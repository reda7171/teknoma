import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import POSClient from '@/components/admin/pos/POSClient';

export default async function POSPage() {
  const t = await getTranslations('Admin');

  let books: any[] = [];
  let packs: any[] = [];
  let accessories: any[] = [];

  try {
    books = await prisma.book.findMany({
      where: { active: true, stock: { gt: 0 } },
      select: {
        id: true,
        title: true,
        price: true,
        image: true,
        stock: true,
        isbn: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    packs = await prisma.pack.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        price: true,
        image: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    accessories = await prisma.extraProduct.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        price: true,
        image: true,
        stock: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error("Database unreachable, loading POS in offline mode");
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <POSClient books={books} packs={packs} accessories={accessories} />
    </div>
  );
}
