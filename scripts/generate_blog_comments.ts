import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-3.5-flash",
  generationConfig: {
    temperature: 0.8,
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          content: {
            type: SchemaType.STRING,
            description: "Le texte du commentaire",
          },
          authorName: {
            type: SchemaType.STRING,
            description: "Le prénom du commentateur",
          }
        },
        required: ["content", "authorName"],
      },
    },
  },
});

const ARABIC_MALE_NAMES = ["Yassine", "Amine", "Adam", "Mehdi", "Karim", "Ayoub", "Omar", "Tariq", "Hassan", "Jamal", "Nabil", "Khalid", "Rachid", "Anas", "Hamza", "Zouhair", "Ilyass", "Walid", "Youssef", "Reda"];
const ARABIC_FEMALE_NAMES = ["Sara", "Lina", "Nadia", "Aya", "Salma", "Meryem", "Fatima", "Khadija", "Hiba", "Zineb", "Imane", "Hajar", "Chaimae", "Kawtar", "Sanae", "Wissal", "Houda", "Yasmine"];
const FRENCH_MALE_NAMES = ["Lucas", "Hugo", "Léo", "Gabriel", "Arthur", "Louis", "Raphaël", "Jules", "Thomas", "Paul", "Mathis", "Nathan", "Théo", "Antoine"];
const FRENCH_FEMALE_NAMES = ["Emma", "Alice", "Chloé", "Léa", "Camille", "Manon", "Juliette", "Louise", "Clara", "Inès", "Sarah", "Anna", "Jade", "Lucie"];
const ENGLISH_MALE_NAMES = ["James", "Thomas", "David", "Michael", "John", "William", "Daniel", "Matthew", "Joseph", "Robert", "Christopher", "Andrew"];
const ENGLISH_FEMALE_NAMES = ["Emily", "Olivia", "Sophia", "Jessica", "Ava", "Isabella", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn", "Abigail"];

function getRandomNames(language: string, count: number): string[] {
  let malePool: string[] = [];
  let femalePool: string[] = [];

  if (language === 'ar') {
    malePool = ARABIC_MALE_NAMES;
    femalePool = ARABIC_FEMALE_NAMES;
  } else if (language === 'fr') {
    malePool = [...FRENCH_MALE_NAMES, ...ARABIC_MALE_NAMES]; // Mix since it's a Moroccan site
    femalePool = [...FRENCH_FEMALE_NAMES, ...ARABIC_FEMALE_NAMES];
  } else {
    malePool = [...ENGLISH_MALE_NAMES, ...ARABIC_MALE_NAMES];
    femalePool = [...ENGLISH_FEMALE_NAMES, ...ARABIC_FEMALE_NAMES];
  }

  const selectedNames: string[] = [];
  const allNames = [...malePool, ...femalePool];

  for (let i = 0; i < count; i++) {
    // Shuffle and pick
    const randIndex = Math.floor(Math.random() * allNames.length);
    selectedNames.push(allNames[randIndex]);
    allNames.splice(randIndex, 1); // Avoid picking the same name for the same article
  }

  return selectedNames;
}

function getRandomDateBetween(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Démarrage du script de génération de commentaires...");

  const posts = await prisma.post.findMany({
    include: {
      comments: true,
    }
  });

  console.log(`📚 ${posts.length} articles trouvés dans la base de données.`);

  const stats = {
    totalAnalyzed: 0,
    skippedAlreadyHasComments: 0,
    target0: 0,
    target1: 0,
    target2: 0,
    target3: 0,
    generatedTotal: 0,
    langFr: 0,
    langEn: 0,
    langAr: 0, // Darija
  };

  for (const post of posts) {
    stats.totalAnalyzed++;

    if (post.comments.length > 0) {
      console.log(`⏩ Article "${post.title.substring(0, 30)}..." ignoré (possède déjà ${post.comments.length} commentaires).`);
      stats.skippedAlreadyHasComments++;
      continue;
    }

    // Déterminer le nombre de commentaires (0: 20%, 1: 45%, 2: 30%, 3: 5%)
    const rand = Math.random();
    let numComments = 0;
    if (rand < 0.20) {
      numComments = 0;
      stats.target0++;
    } else if (rand < 0.65) {
      numComments = 1;
      stats.target1++;
    } else if (rand < 0.95) {
      numComments = 2;
      stats.target2++;
    } else {
      numComments = 3;
      stats.target3++;
    }

    if (numComments === 0) {
      console.log(`⏭️  Article "${post.title.substring(0, 30)}..." : 0 commentaire attribué.`);
      continue;
    }

    const languageStr = post.language === 'ar' ? 'Darija marocaine' : post.language === 'en' ? 'Anglais' : 'Français';
    console.log(`⏳ Génération de ${numComments} commentaire(s) en ${languageStr} pour : "${post.title.substring(0, 30)}..."`);

    const names = getRandomNames(post.language, numComments);

    // Tronquer le contenu pour ne pas exploser les tokens
    const truncatedContent = post.content ? post.content.substring(0, 3000) : "";

    const prompt = `
Tu es un lecteur authentique du blog littéraire "PetsUnivers".
Je vais te fournir le titre et un extrait d'un article de blog.
L'article est écrit en ${languageStr}.

Ton objectif :
Générer EXACTEMENT ${numComments} commentaire(s) pour cet article.
Chaque commentaire doit sembler écrit par une personne différente et doit utiliser les noms suivants : ${names.join(', ')}.

RÈGLES STRICTES :
1. Langue : Les commentaires doivent IMPÉRATIVEMENT être écrits en ${languageStr}. Si c'est "Darija marocaine", utilise le dialecte marocain authentique (soit en alphabet arabe soit en alphabet latin, comme les marocains écrivent sur internet).
2. Pertinence : Le commentaire DOIT faire référence à une idée, un personnage, l'auteur, ou un argument précis mentionné dans le texte de l'article. Pas de commentaires génériques.
3. Diversité des profils :
   - Certains sont très courts (1 phrase).
   - D'autres sont moyens (2-3 phrases).
   - D'autres un peu plus longs (3-5 phrases).
   - Alterne entre : question, accord, léger désaccord, expérience personnelle avec le livre, citation d'un passage.
4. À BANNIR ABSOLUMENT :
   - Les avis commerciaux, faux témoignages d'achats ("J'ai acheté ce livre ici", "livraison rapide").
   - Les phrases clichées seules ("Très bon article !", "Merci pour ce contenu", "Je recommande").
5. Assigne chaque commentaire à l'un des noms fournis. Ne retourne que du JSON avec la structure attendue.

Titre de l'article : ${post.title}
Catégorie : ${post.category || 'Livre'}
Extrait de l'article :
"""
${truncatedContent}
"""
`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      let generatedComments = [];
      try {
        generatedComments = JSON.parse(responseText);
      } catch (e) {
        console.error("Erreur de parsing JSON", responseText);
        continue;
      }

      // Si l'IA n'a pas retourné un tableau, on force
      if (!Array.isArray(generatedComments)) {
         if (generatedComments.content) {
            generatedComments = [generatedComments];
         } else {
            console.error("Le format JSON retourné n'est pas un tableau:", generatedComments);
            continue;
         }
      }

      // Limiter au nombre demandé au cas où l'IA en génère plus
      generatedComments = generatedComments.slice(0, numComments);

      for (const gc of generatedComments) {
        if (!gc.content || !gc.authorName) continue;

        // Générer une date entre la publication et aujourd'hui
        const startDate = post.publishedAt || post.createdAt;
        const endDate = new Date();
        const randomDate = getRandomDateBetween(startDate, endDate);

        await prisma.comment.create({
          data: {
            content: gc.content.trim(),
            postId: post.id,
            authorName: gc.authorName,
            isApproved: true,
            createdAt: randomDate,
          }
        });

        stats.generatedTotal++;
        if (post.language === 'ar') stats.langAr++;
        else if (post.language === 'en') stats.langEn++;
        else stats.langFr++;
      }

      console.log(`✅ ${generatedComments.length} commentaire(s) inséré(s).`);

      // Pause de 15 secondes pour respecter le quota gratuit Gemini (15 RPM)
      await sleep(15000);

    } catch (error) {
      console.error(`❌ Erreur lors de la génération pour l'article ${post.id}:`, error);
    }
  }

  console.log("\n=============================================");
  console.log("📊 RAPPORT GLOBAL DE GÉNÉRATION DES COMMENTAIRES");
  console.log("=============================================");
  console.log(`Nombre total d'articles analysés : ${stats.totalAnalyzed}`);
  console.log(`Articles ignorés (avaient déjà des commentaires) : ${stats.skippedAlreadyHasComments}`);
  console.log(`Articles avec 0 commentaire attribué : ${stats.target0} (${((stats.target0 / (stats.totalAnalyzed - stats.skippedAlreadyHasComments || 1)) * 100).toFixed(1)}%)`);
  console.log(`Articles avec 1 commentaire attribué : ${stats.target1} (${((stats.target1 / (stats.totalAnalyzed - stats.skippedAlreadyHasComments || 1)) * 100).toFixed(1)}%)`);
  console.log(`Articles avec 2 commentaires attribués : ${stats.target2} (${((stats.target2 / (stats.totalAnalyzed - stats.skippedAlreadyHasComments || 1)) * 100).toFixed(1)}%)`);
  console.log(`Articles avec 3 commentaires attribués : ${stats.target3} (${((stats.target3 / (stats.totalAnalyzed - stats.skippedAlreadyHasComments || 1)) * 100).toFixed(1)}%)`);
  console.log("\nCOMMENTAIRES GÉNÉRÉS :");
  console.log(`Nombre total de commentaires générés et insérés : ${stats.generatedTotal}`);
  console.log(`- En Français : ${stats.langFr}`);
  console.log(`- En Anglais : ${stats.langEn}`);
  console.log(`- En Darija : ${stats.langAr}`);
  console.log("=============================================\n");

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
