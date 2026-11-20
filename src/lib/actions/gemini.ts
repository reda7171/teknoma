'use server'

import { generateText as baseGenerateText, executeWithModelFallback } from "@/lib/gemini";
import { verifyAdmin } from "./auth";
import { prisma } from "@/lib/prisma";

export async function generatePostContent(
    input: string,
    language: 'fr' | 'ar',
    type: 'TITLE' | 'EXCERPT' | 'CONTENT' | 'SLUG' = 'CONTENT'
) {
    try {
        await verifyAdmin(["ADMIN","MANAGER","BLOG_MODERATOR"])

        if (!input) return { success: false, error: 'Une entrée est requise.' }

        let prompt = '';

        if (type === 'SLUG') {
            prompt = `Génère un slug d'URL SEO-friendly (en caractères latins, minuscules, séparés par des tirets) pour l'article suivant : "${input}". Réponds UNIQUEMENT avec le slug.`;
        } else if (type === 'TITLE') {
            prompt = language === 'fr'
                ? `Génère 5 titres d'articles de blog accrocheurs et professionnels en français pour une librairie nommée "Riwaya" basés sur ces mots-clés : "${input}". Réponds UNIQUEMENT avec le meilleur titre, sans ponctuation inutile au début ou à la fin.`
                : `Génère 5 titres d'articles de blog accrocheurs et professionnels en arabe pour une librairie nommée "Riwaya" basés sur ces mots-clés : "${input}". Réponds UNIQUEMENT avec le meilleur titre, sans ponctuation inutile au début ou à la fin.`;
        } else if (type === 'EXCERPT') {
            prompt = language === 'fr'
                ? `Rédige un court extrait (résumé) professionnel et intriguant en français (max 160 caractères) pour un article dont le sujet est : "${input}".`
                : `Rédige un court extrait (résumé) professionnel et intriguant en arabe (max 160 caractères) pour un article dont le sujet est : "${input}".`;
        } else {
            const structure = `
                1. Introduction (Accroche et pourquoi le lire)
                2. Informations générales (Titre, Auteur, Genre, Pages, etc.)
                3. Résumé (Court, sans spoiler)
                4. Les personnages (Principaux et secondaires)
                5. Les thèmes abordés
                6. Style d'écriture (Narration, ton, rythme)
                7. Les points forts
                8. Les points faibles
                9. Citation(s) marquante(s)
                10. Analyse / interprétation (Symbolisme, message)
                11. Comparaison (Si vous avez aimé X, vous aimerez Y)
                12. Adaptation (Film/Série si existante)
                13. Pour quel type de lecteur ?
                14. Note finale / avis personnel (Noter sur 5: Histoire, Style, Fin) + Note globale étoile
                FAQ (3 questions pertinentes)
            `;

            prompt = language === 'fr'
                ? `Rédige un article de blog complet et professionnel pour la librairie "Riwaya" sur le livre ou le thème suivant : "${input}".
                   Tu DOIS impérativement suivre cette structure Markdown :
                   ${structure}
                   Rédige un contenu de haute qualité, optimisé pour le SEO et engageant.`
                : `Rédige un article de blog complet et professionnel pour la librairie "Riwaya" sur le livre ou le thème suivant : "${input}".
                   Tu DOIS impérativement suivre cette structure Markdown (en arabe) :
                   ${structure}
                   Rédige un contenu de haute qualité (en arabe), optimisé pour le SEO et engageant.`;
        }

        const content = await baseGenerateText(prompt);

        if (!content) return { success: false, error: 'Erreur lors de la génération.' }

        return { success: true, content: content.trim() }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Analyse le contenu d'un article avec Gemini et suggère les 2 ou 3 livres les plus pertinents du catalogue.
 */
export async function suggestRelatedBooksForPost(params: {
    title?: string;
    excerpt?: string;
    content?: string;
    currentBookIds?: string[];
}) {
    try {
        await verifyAdmin(["ADMIN", "MANAGER", "BLOG_MODERATOR"]);

        const title = (params.title || '').trim();
        const excerpt = (params.excerpt || '').trim();
        const content = (params.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        if (!title && !content && !excerpt) {
            return { success: false, error: "Veuillez renseigner un titre ou du contenu pour l'analyse IA." };
        }

        // 1. Extraire les mots-clés significatifs de l'article pour cibler les candidats
        const textToAnalyze = `${title} ${excerpt} ${content.slice(0, 2000)}`;
        const keywords = Array.from(new Set(
            textToAnalyze
                .toLowerCase()
                .replace(/[^a-z0-9\u0600-\u06FF\s-]/gi, ' ')
                .split(/\s+/)
                .filter(w => w.length >= 3 && !['les', 'des', 'une', 'qui', 'dans', 'pour', 'avec', 'sur', 'par', 'est', 'sont', 'cette', 'cet', 'ces', 'mais', 'donc', 'tout', 'tous', 'plus', 'comme', 'faire', 'peut'].includes(w))
        )).slice(0, 15);

        // 2. Recherche ciblée des livres matchant les mots-clés
        const matchedBooks = keywords.length > 0 ? await prisma.book.findMany({
            where: {
                active: true,
                OR: keywords.slice(0, 8).map(kw => ({
                    OR: [
                        { title: { contains: kw } },
                        { titleFr: { contains: kw } },
                        { author: { contains: kw } },
                        { category: { contains: kw } }
                    ]
                }))
            },
            select: {
                id: true,
                title: true,
                titleFr: true,
                titleEn: true,
                author: true,
                category: true,
            },
            take: 40
        }) : [];

        // 3. Compléter avec les livres les plus consultés/populaires
        const popularBooks = await prisma.book.findMany({
            where: { active: true },
            select: {
                id: true,
                title: true,
                titleFr: true,
                titleEn: true,
                author: true,
                category: true,
            },
            orderBy: [
                { views: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 60
        });

        // Fusionner et dédupliquer les candidats
        const candidateMap = new Map<string, any>();
        matchedBooks.forEach(b => candidateMap.set(b.id, b));
        popularBooks.forEach(b => candidateMap.set(b.id, b));
        const candidateBooks = Array.from(candidateMap.values());

        if (candidateBooks.length === 0) {
            return { success: false, error: "Aucun livre actif disponible dans le catalogue." };
        }

        // 4. Formater la liste pour Gemini
        const catalogSummary = candidateBooks.map(b => {
            const displayTitle = b.titleFr || b.title || b.titleEn || 'Sans titre';
            const cat = b.category ? ` [${b.category}]` : '';
            return `- ID: "${b.id}" | Titre: "${displayTitle}" | Auteur: "${b.author}"${cat}`;
        }).join('\n');

        const prompt = `Tu es le libraire et conseiller éditorial en chef de la librairie Riwaya.
Analyse cet article de blog :
TITRE: "${title}"
EXTRAIT: "${excerpt}"
DÉBUT DU CONTENU: "${content.slice(0, 1500)}"

CATALOGUE DE LIVRES SÉLECTIONNABLES :
${catalogSummary}

MISSION :
Sélectionne les 2 ou 3 livres de la liste ci-dessus qui sont les plus directement liés au sujet, à l'auteur, aux thématiques ou aux recommandations de cet article.
Si l'article analyse ou cite précisément un ou plusieurs livres du catalogue, ils DOIVENT impérativement faire partie de ta sélection.

CONSIGNE STRICTE :
Réponds UNIQUEMENT sous la forme d'un tableau JSON d'identifiants (IDs) valides figurant dans la liste fournie ci-dessus, sans aucun texte explicatif, sans balises markdown :
["id1", "id2", "id3"]`;

        const resultJson = await executeWithModelFallback(async (model) => {
            const res = await model.generateContent(prompt);
            const rawText = res.response.text().trim().replace(/```json|```/gi, '').trim();
            const match = rawText.match(/\[[\s\S]*?\]/);
            if (!match) throw new Error("Format JSON non reconnu par l'IA");
            return JSON.parse(match[0]);
        });

        if (!Array.isArray(resultJson)) {
            return { success: false, error: "Réponse inattendue de l'IA" };
        }

        // Valider que les IDs existent dans nos candidats
        const validIds = resultJson.filter(id => typeof id === 'string' && candidateMap.has(id)).slice(0, 3);

        if (validIds.length === 0) {
            return { success: false, error: "Aucun livre pertinent n'a pu être identifié." };
        }

        return {
            success: true,
            suggestedBookIds: validIds,
            count: validIds.length
        };
    } catch (error: any) {
        console.error("Erreur suggestRelatedBooksForPost:", error);
        return { success: false, error: error.message || "Erreur lors de la suggestion IA" };
    }
}
