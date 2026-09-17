import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Réinitialisation des tables en cours...");
  
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE page_views;`);
    console.log("✅ Table 'page_views' vidée avec succès.");
    
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE cron_logs;`);
    console.log("✅ Table 'cron_logs' vidée avec succès.");
    
  } catch (error) {
    console.error("Erreur lors de la réinitialisation :", error);
  }
}

main().finally(() => prisma.$disconnect());
