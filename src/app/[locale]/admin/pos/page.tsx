import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import POSClient from '@/components/admin/pos/POSClient';
import { getSetting } from '@/lib/actions/site-settings';

export default async function POSPage() {
  const t = await getTranslations('Admin');

  let books: any[] = [];
  let packs: any[] = [];
  let accessories: any[] = [];
  
  const showCategories = await getSetting('pos_show_categories') !== 'false';
  const showSearch = await getSetting('pos_show_search') !== 'false';
  const defaultDiscount = Number(await getSetting('pos_default_discount')) || 0;
  const maxDiscount = Number(await getSetting('pos_max_discount')) || 100;
  const favoriteCategories = await getSetting('pos_favorite_categories') || '';
  const defaultGridCols = Number(await getSetting('pos_default_grid_cols')) || 8;
  const defaultTab = await getSetting('pos_default_tab') || 'ALL';
  const allowOutOfStock = await getSetting('pos_allow_out_of_stock') === 'true';
  const requireCustomer = await getSetting('pos_require_customer') !== 'false'; // Default to true if not set
  const enableSessions = await getSetting('pos_enable_sessions') === 'true';
  
  const activeCompanies = await prisma.shippingCompany.findMany({ where: { isActive: true } });
  const shippingCompanies = activeCompanies.map(c => ({ id: c.id, name: c.name }));

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
      <POSClient 
        books={books} 
        packs={packs} 
        accessories={accessories} 
        showCategories={showCategories}
        showSearch={showSearch}
        defaultDiscount={defaultDiscount}
        maxDiscount={maxDiscount}
        favoriteCategories={favoriteCategories}
        defaultGridCols={defaultGridCols}
        defaultTab={defaultTab as any}
        allowOutOfStock={allowOutOfStock}
        requireCustomer={requireCustomer}
        enableSessions={enableSessions}
        shippingCompanies={shippingCompanies}
      />
    </div>
  );
}
