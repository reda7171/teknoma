const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Fetching main warehouse...');
    let warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
        console.log('No warehouse found. Creating one...');
        warehouse = await prisma.warehouse.create({
            data: {
                id: 'warehouse-principal-001',
                name: 'Entrepôt Principal',
                location: 'Casablanca',
            }
        });
    }

    console.log(`Using warehouse: ${warehouse.name} (${warehouse.id})`);

    const accessories = await prisma.extraProduct.findMany({
        where: { stock: { gt: 0 } }
    });

    console.log(`Found ${accessories.length} accessories with stock > 0.`);

    for (const acc of accessories) {
        const existingInventory = await prisma.inventory.findFirst({
            where: { extraProductId: acc.id, warehouseId: warehouse.id }
        });

        if (!existingInventory) {
            console.log(`Migrating ${acc.name} - Stock: ${acc.stock}`);
            await prisma.inventory.create({
                data: {
                    extraProductId: acc.id,
                    warehouseId: warehouse.id,
                    quantity: acc.stock,
                }
            });

            await prisma.stockMovement.create({
                data: {
                    extraProductId: acc.id,
                    toWarehouseId: warehouse.id,
                    quantity: acc.stock,
                    type: 'ENTRANCE',
                    note: 'Migration initiale du stock'
                }
            });
        }
    }

    console.log('Migration des accessoires terminée avec succès !');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
