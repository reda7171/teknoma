const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const fromWarehouseId = 'warehouse-principal-001';
    const toWarehouseId = '17d23741-632a-4b94-b89a-d21fd545a50e';

    const sourceInventory = await prisma.inventory.findMany({
        where: { warehouseId: fromWarehouseId }
    });

    console.log(`Trouvé ${sourceInventory.length} articles dans l'entrepôt principal.`);

    let createdCount = 0;
    for (const item of sourceInventory) {
        const existing = await prisma.inventory.findFirst({
            where: {
                warehouseId: toWarehouseId,
                bookId: item.bookId,
                extraProductId: item.extraProductId
            }
        });

        if (!existing) {
            await prisma.inventory.create({
                data: {
                    bookId: item.bookId,
                    extraProductId: item.extraProductId,
                    warehouseId: toWarehouseId,
                    quantity: 0
                }
            });
            createdCount++;
        }
    }

    console.log(`${createdCount} articles copiés avec succès vers l'entrepôt Oumaima avec un stock de 0 !`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
