/**
 * Utilitaire d'extraction des 3 idées forces et citations à partir d'un article de blog lié ou des métadonnées du livre.
 * Conçu pour les lecteurs pressés souhaitant aller à l'essentiel en moins de 30 secondes.
 */

export interface BookEditorialInsights {
    keyIdeas: string[];
    quote: string | null;
    quoteAuthor?: string | null;
    sourcePost?: {
        id: string;
        title: string;
        slug: string;
        authorName?: string | null;
        totalReadTime?: number | null;
    } | null;
}

function cleanMarkdownLine(line: string): string {
    return line
        .replace(/^[-*•\d\.\s]+/, '')
        .replace(/[*_#`~[\]]/g, '')
        .replace(/\([^)]*\)/g, '')
        .trim();
}

export function extractBookInsights(params: {
    post?: any;
    book: {
        id: string;
        title: string;
        author: string;
        category?: string | null;
        description?: string | null;
    };
    locale: string;
}): BookEditorialInsights {
    const { post, book, locale } = params;

    const rawContent: string = post?.content || '';
    const rawExcerpt: string = post?.excerpt || '';

    let extractedQuote: string | null = null;
    let extractedIdeas: string[] = [];

    if (rawContent) {
        // 1. Recherche d'une citation marquante
        const quoteBlockMatch = rawContent.match(/^>\s*(.+)$/m);
        if (quoteBlockMatch && quoteBlockMatch[1].trim().length > 15) {
            extractedQuote = cleanMarkdownLine(quoteBlockMatch[1]);
        } else {
            const quotationMatch = rawContent.match(/[«"“]([^»"”]{20,220})[»"”]/);
            if (quotationMatch && quotationMatch[1].trim().length > 20) {
                extractedQuote = quotationMatch[1].trim();
            }
        }

        // 2. Recherche des 3 idées forces à travers les sections ou listes à puces
        const lines = rawContent.split('\n').map(l => l.trim()).filter(Boolean);
        const bulletCandidates: string[] = [];

        // Recherche ciblée après des titres comme "Points forts", "Thèmes", "Pourquoi", "Analyse", "Résumé"
        let inRelevantSection = false;
        for (const line of lines) {
            if (/^#+\s*(points?\s+forts?|thèmes?|idées?|pourquoi|analyse|retenir|enseignements?|نقاط|محاور|أفكار)/i.test(line)) {
                inRelevantSection = true;
                continue;
            }
            if (/^#+\s*/.test(line)) {
                inRelevantSection = false;
            }

            if (/^[-*•]\s+|^[1-9]\.\s+/.test(line)) {
                const cleaned = cleanMarkdownLine(line);
                if (cleaned.length >= 25 && cleaned.length <= 260) {
                    if (inRelevantSection) {
                        bulletCandidates.unshift(cleaned); // Priorité aux sections clés
                    } else {
                        bulletCandidates.push(cleaned);
                    }
                }
            }
        }

        if (bulletCandidates.length >= 3) {
            extractedIdeas = bulletCandidates.slice(0, 3);
        } else if (bulletCandidates.length > 0) {
            extractedIdeas = [...bulletCandidates];
        }

        // Si nous n'avons pas assez de puces, découpons les phrases marquantes de l'article ou de l'extrait
        if (extractedIdeas.length < 3) {
            const paragraphs = lines.filter(l => !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('!'));
            const textCorpus = paragraphs.slice(0, 5).join(' ');
            const sentences = textCorpus.match(/[^.!?]+[.!?]+/g) || [];
            for (const s of sentences) {
                const cleaned = cleanMarkdownLine(s);
                if (cleaned.length >= 35 && cleaned.length <= 220 && !extractedIdeas.includes(cleaned)) {
                    extractedIdeas.push(cleaned);
                    if (extractedIdeas.length === 3) break;
                }
            }
        }
    }

    // 3. Repli gracieux / Fallback si les idées sont insuffisantes
    if (extractedIdeas.length < 3) {
        const desc = (book.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const sentences = desc.match(/[^.!?]+[.!?]+/g) || [];
        
        for (const s of sentences) {
            const cleaned = s.trim();
            if (cleaned.length >= 30 && !extractedIdeas.includes(cleaned)) {
                extractedIdeas.push(cleaned);
                if (extractedIdeas.length === 3) break;
            }
        }

        // Si toujours moins de 3, ajouter des repères éditoriaux
        if (extractedIdeas.length === 0) {
            if (locale === 'ar') {
                extractedIdeas = [
                    `فهم عميق لأهم المبادئ التي يطرحها الكاتب ${book.author} بأسلوب شيق وممتع.`,
                    `دليل عملي وتطبيقي يقدم رؤية واضحة ومباشرة لكافة جوانب الموضوع.`,
                    `عمل أدبي وفكري ملهم يعد مرجعاً أساسياً في تصنيف ${book.category || 'الكتب المختارة'}.`
                ];
            } else if (locale === 'en') {
                extractedIdeas = [
                    `A deep exploration of key concepts delivered in ${book.author}'s engaging writing style.`,
                    `Practical insights and clear perspectives that provide immediate value to the reader.`,
                    `A transformative read and essential reference in ${book.category || 'curated literature'}.`
                ];
            } else {
                extractedIdeas = [
                    `Une exploration approfondie des concepts clés portée par l'écriture captivante de ${book.author}.`,
                    `Des enseignements concrets et clairs offrant une valeur immédiatement applicable.`,
                    `Un ouvrage inspirant et incontournable dans le domaine ${book.category ? `« ${book.category} »` : 'de notre sélection'}.`
                ];
            }
        } else while (extractedIdeas.length < 3) {
            if (locale === 'ar') {
                extractedIdeas.push(`إضاءات مميزة ورؤى ملهمة تناسب القارئ الباحث عن خلاصة سريعة ومفيدة.`);
            } else if (locale === 'en') {
                extractedIdeas.push(`A compelling framework offering immediate clarity for purposeful readers.`);
            } else {
                extractedIdeas.push(`Une perspective enrichissante offrant une synthèse claire et inspirante pour votre quotidien.`);
            }
        }
    }

    // Fallback citation
    if (!extractedQuote && rawExcerpt) {
        extractedQuote = cleanMarkdownLine(rawExcerpt);
    }

    return {
        keyIdeas: extractedIdeas.slice(0, 3),
        quote: extractedQuote,
        quoteAuthor: post?.authorName || book.author,
        sourcePost: post ? {
            id: post.id,
            title: post.title,
            slug: post.slug,
            authorName: post.authorName,
            totalReadTime: post.totalReadTime,
        } : null,
    };
}
