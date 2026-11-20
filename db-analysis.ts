import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Analyse de la base de données en cours...");
  
  try {
    const result: any[] = await prisma.$queryRaw`
      SELECT 
        table_name AS TableName,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS SizeMB,
        ROUND((data_length / 1024 / 1024), 2) AS DataMB,
        ROUND((index_length / 1024 / 1024), 2) AS IndexMB,
        table_rows AS TotalRows
      FROM information_schema.TABLES 
      WHERE table_schema = DATABASE()
      ORDER BY (data_length + index_length) DESC;
    `;
    
    let totalSize = 0;
    console.log("=========================================");
    console.log("Table | Taille totale (MB) | Lignes");
    console.log("-----------------------------------------");
    for (const row of result) {
      totalSize += Number(row.SizeMB);
      console.log(`${row.TableName.padEnd(20)} | ${row.SizeMB.toString().padStart(8)} MB | ${row.TotalRows}`);
    }
    console.log("=========================================");
    console.log(`TAILLE TOTALE DE LA BASE : ${totalSize.toFixed(2)} MB`);
    
  } catch (error) {
    console.error("Erreur lors de l'analyse :", error);
  }
}

main().finally(() => prisma.$disconnect());
