import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  generationConfig: {
    temperature: 0.3,
  },
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Démarrage de la génération de descriptions (Livres 351-400)...");

  const books = await prisma.book.findMany({
    where: {
      OR: [
        { description: "" },
        { description: { contains: "Description à venir" } },
        { description: { contains: "Description non disponible" } }
      ]
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  console.log(`📚 ${books.length} livres trouvés pour cette session.`);

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`\nTraitement du livre ${i + 351} : "${book.title}" (ID: ${book.id})`);

    // Si la description existe déjà et n'est pas "Description non disponible" ou très courte
    if (book.description && book.description.length > 50 && !book.description.includes("Description à venir")) {
       console.log("⏭️  Description déjà existante, ignoré.");
       continue;
    }

    const prompt = `
Tu es un expert SEO et copywriter pour la librairie en ligne marocaine Riwaya.store.
Rédige une courte description commerciale pour le livre suivant.
Titre: "${book.title}"
Auteur: "${book.author}"

Directives obligatoires:
- La description doit faire maximum 3 à 5 lignes.
- Sois très factuel, percutant et vendeur.
- N'utilise AUCUN emoji.
- La langue doit être un français parfait.
- Si le titre ou l'auteur est en arabe, tu peux utiliser des mots-clés en français et en arabe translittéré pour le SEO.
- Ne rajoute pas d'introduction (du style "Voici la description :"), donne juste le texte.
`;

    try {
      const result = await model.generateContent(prompt);
      let newDescription = result.response.text().trim();
      
      // Cleanup des quotes potentielles au début et à la fin
      if (newDescription.startsWith('"') && newDescription.endsWith('"')) {
          newDescription = newDescription.slice(1, -1);
      }

      await prisma.book.update({
        where: { id: book.id },
        data: { description: newDescription }
      });

      console.log(`✅ Succès: ${newDescription.substring(0, 80)}...`);
      
      // Pause pour éviter le rate limit
      await sleep(1500);
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de "${book.title}":`, error);
      await sleep(3000); // Pause plus longue en cas d'erreur
    }
  }

  console.log("\n🎉 Génération terminée !");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
