import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSetting } from "@/lib/actions/site-settings";
import { prisma } from "@/lib/prisma";

const GEMINI_CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.8-flash",
].filter(Boolean) as string[];

const SYSTEM_INSTRUCTION_DEFAULT = `Tu es l'assistant intelligent de Riwaya, une librairie en ligne au Maroc.
Tes réponses doivent être chaleureuses, utiles et professionnelles.

INFOS CLÉS :
- Livraison : 2 à 4 jours ouvrés au Maroc.
- Frais : 30 DH à domicile, Gratuit dès 500 DH d'achat.
- Paiement : Uniquement Paiement à la Livraison (Cash on Delivery - COD).

CAPACITÉS :
- Tu as accès au catalogue de livres et aux commandes.
- Si tu donnes des infos sur un livre, utilise un ton enthousiaste.
- Si l'utilisateur cherche un livre, aide-le à le trouver.

RÈGLES :
- Réponds en français ou en arabe selon la langue de l'utilisateur.
- Ne mentionne jamais que tu es une IA ou un modèle de langage. Tu es "l'Assistant Riwaya".
- Sois concis.`;

export async function executeWithModelFallback<T>(
  runner: (model: any) => Promise<T>,
  systemInstruction?: string
): Promise<T> {
  const apiKey = (await getSetting("gemini_api_key")) || process.env.GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  const genAI = new GoogleGenerativeAI(apiKey);

  let lastError: any = null;
  const modelsToTry = Array.from(new Set(GEMINI_CANDIDATE_MODELS));

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...(systemInstruction ? { systemInstruction } : {})
      });
      return await runner(model);
    } catch (error: any) {
      lastError = error;
      const errMsg = error?.message || String(error);
      const isTransient = errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("404") || errMsg.includes("high demand") || errMsg.includes("Service Unavailable");
      if (isTransient) {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

export async function getGeminiModel(preferredModel?: string) {
  const apiKey = (await getSetting("gemini_api_key")) || process.env.GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ 
    model: preferredModel || process.env.GEMINI_MODEL || "gemini-3.7-flash",
    systemInstruction: SYSTEM_INSTRUCTION_DEFAULT
  });
}

export async function chatWithDatabase(message: string, locale: string = 'fr') {
  try {
    const msg = message.toLowerCase().trim();

    // Gestion rapide des salutations pour économiser des ressources
    const greetings = ['bonjour', 'salut', 'salam', 'hello', 'hey', 'صباح', 'مرحبا'];
    if (greetings.some(g => msg === g || msg.startsWith(g + ' '))) {
      const welcome = locale === 'ar' 
        ? "مرحباً! ✨ أنا المساعد الذكي لـ **رواية**. كيف يمكنني مساعدتك اليوم؟" 
        : "Bonjour ! ✨ Je suis l'assistant intelligent de **Riwaya**. Comment puis-je vous aider aujourd'hui ?";
      return { text: welcome, type: undefined, data: undefined };
    }

    let context = "";
    let dataType: 'books' | 'order' | undefined;
    let data: any;

    // 1. Détection d'intention pour le contexte DB
    if (msg.includes("commande") || msg.includes("suivi") || msg.includes("طلب") || msg.includes("تتبع")) {
      const orderMatch = msg.match(/(?:(?:commande|suivi|طلب|تتبع)[:\s#]*|#)([a-f0-9-]{6,})/i);
      if (orderMatch) {
        const orderId = orderMatch[1];
        const order = await prisma.order.findFirst({
          where: { id: { startsWith: orderId } },
          select: { id: true, fullName: true, total: true, status: true, createdAt: true, city: true }
        });
        if (order) {
          context = `CONTEXTE COMMANDE : L'utilisateur consulte la commande #${order.id}. Client: ${order.fullName}, Statut: ${order.status}, Ville: ${order.city}, Total: ${order.total} درهم. Date: ${order.createdAt.toLocaleDateString()}.`;
          dataType = 'order';
          data = order;
        } else {
          context = `CONTEXTE : L'utilisateur cherche la commande "${orderId}" mais elle n'existe pas.`;
        }
      }
    } else if (msg.length > 3) {
      // Recherche de livres
      const books = await prisma.book.findMany({
        where: { 
          OR: [
            { title: { contains: message } },
            { author: { contains: message } }
          ],
          active: true 
        },
        take: 5,
        select: { id: true, title: true, author: true, price: true, image: true }
      });

      if (books.length > 0) {
        context = `CONTEXTE LIVRES TROUVÉS :\n${books.map(b => `- ${b.title} par ${b.author} (${b.price} درهم). ID: ${b.id}`).join("\n")}`;
        dataType = 'books';
        data = books;
      }
    }

    const prompt = context 
      ? `CONTEXTE : ${context}\n\nCONSIGNE : Réponds au message suivant de manière concise en utilisant le contexte si pertinent.\nMESSAGE : ${message}` 
      : message;

    const { text } = await executeWithModelFallback(async (model) => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return { text: response.text() };
    }, SYSTEM_INSTRUCTION_DEFAULT);

    return { text, type: dataType, data };
  } catch (error) {
    console.error("Gemini Assistant Error:", error);
    return { text: "Désolé, je rencontre une petite difficulté technique. Réessayez dans un instant ! ✨", type: undefined, data: undefined };
  }
}

export async function generateText(prompt: string) {
  try {
    return await executeWithModelFallback(async (model) => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  } catch (error: any) {
    console.error("Gemini generateText error:", error);
    throw error;
  }
}

export async function generateSeoTagsForBook(title: string, author: string, description?: string) {
  try {
    const prompt = `Génère des balises SEO pour le livre suivant:
Titre: ${title}
Auteur: ${author}
Description: ${description || 'N/A'}

Réponds UNIQUEMENT au format JSON strict avec la structure suivante, sans texte autour, sans balises markdown (comme \`\`\`json):
{
  "seoDescription": "Une meta-description SEO accrocheuse d'environ 150 caractères.",
  "seoKeywords": "mot-clé 1, mot-clé 2, mot-clé 3, mot-clé 4"
}`;
    
    return await executeWithModelFallback(async (model) => {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/```json|```/gi, '');
      const json = JSON.parse(text);
      return {
        seoDescription: json.seoDescription,
        seoKeywords: json.seoKeywords
      };
    });
  } catch (error) {
    console.error("Error generating SEO tags:", error);
    return null;
  }
}

export async function generateRecommendations(authors: string[]) {
  try {
    if (!authors || authors.length === 0) return null;
    const authorsList = authors.join(', ');
    const prompt = `Le lecteur s'intéresse à ces auteurs: ${authorsList}.
Suggère-lui 4 livres passionnants qui pourraient lui plaire (soit des mêmes auteurs, soit d'auteurs similaires).

Réponds UNIQUEMENT au format JSON strict (sans \`\`\`json) sous forme d'un tableau d'objets avec cette structure exacte :
[
  {
    "title": "Titre du livre",
    "author": "Auteur",
    "reason": "Une courte phrase accrocheuse expliquant pourquoi ce livre est recommandé."
  }
]`;
    
    return await executeWithModelFallback(async (model) => {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/```json|```/gi, '');
      return JSON.parse(text);
    });
  } catch (error) {
    console.warn("Notice: Gemini recommendations fallback activated.");
    return null;
  }
}
