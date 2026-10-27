/**
 * Hook & utilitaire d'auto-classification automatique des livres par analyse sémantique de mots-clés
 */

export interface ClassificationInput {
    title?: string | null
    author?: string | null
    description?: string | null
    language?: string | null
    category?: string | null
    subCategory?: string | null
}

export interface ClassificationResult {
    category: string
    subCategory: string | null
    autoClassified: boolean
}

const INVALID_CATEGORIES = new Set([
    '',
    'autre',
    'autres',
    'non classé',
    'non classée',
    'non classés',
    'uncategorized',
    'general',
    'livres',
    'livre',
    'null',
    'undefined'
])

export function autoClassifyBook(input: ClassificationInput): ClassificationResult {
    const rawCategory = (input.category || '').trim()
    const lowerCategory = rawCategory.toLowerCase()

    // Si une catégorie valide est déjà définie manuellement, la conserver
    if (rawCategory && !INVALID_CATEGORIES.has(lowerCategory)) {
        return {
            category: rawCategory,
            subCategory: input.subCategory || null,
            autoClassified: false
        }
    }

    const title = (input.title || '').toLowerCase()
    const author = (input.author || '').toLowerCase()
    const desc = (input.description || '').toLowerCase()
    const lang = (input.language || '').toLowerCase()
    const text = `${title} ${author} ${desc}`

    // 1. Détection Arabe
    const isArabic = lang === 'ar' || /[\u0600-\u06FF]/.test(title)
    if (isArabic) {
        if (text.match(/قرآن|مصحف|تفسير|حديث|فقه|سنة|إسلام|سيرة|عقيدة|صلاة|دعاء|رمضان|نبوي|شرع/)) {
            return { category: 'Religion & Spiritualité', subCategory: 'القرآن وعلومه', autoClassified: true }
        }
        if (text.match(/خوف|رواية|قصة|أدب|شعر|حكايات|بساتين|أسامة المسلم|نجيب محفوظ|غسان كنفاني|محمود درويش|أحمد مراد/)) {
            return { category: 'Romans & Littérature', subCategory: 'روايات عربية', autoClassified: true }
        }
        if (text.match(/تطوير الذات|نجاح|عادات|إغواء|سطوة|قوة|ثقة|تحفيز|ذكاء|أموال|روبرت غرين|ديل كارنيجي/)) {
            return { category: 'Développement Personnel', subCategory: 'Développement personnel', autoClassified: true }
        }
        if (text.match(/أطفال|قصص أطفال|تلوين|ناشئة|تعليم مبكر/)) {
            return { category: 'Jeunesse', subCategory: 'Livres en arabe pour enfant', autoClassified: true }
        }
        return { category: 'Littérature', subCategory: 'Livres en arabe', autoClassified: true }
    }

    // 2. Mangas & BD
    if (text.match(/\bmanga\b|\bbd\b|\bcomics\b|one piece|naruto|jujutsu|demon slayer|dragon ball|attack on titan|bleach|marvel|dc comics|webtoon/)) {
        return { category: 'BD & Mangas', subCategory: text.includes('manga') ? 'Mangas' : 'BD', autoClassified: true }
    }

    // 3. Jeunesse & Enfants
    if (text.match(/enfant|enfants|jeunesse|album|conte|contes|tome jeunesse|3-6 ans|6-9 ans|9-12 ans|disney|peppa|petit prince|coloriage|bedtime stories|baby|toddler|picture book/)) {
        return { category: 'Jeunesse', subCategory: '3-6 ans', autoClassified: true }
    }

    // 4. Religion & Spiritualité
    if (text.match(/\bbible\b|\bchurch\b|catholic|christian|christianity|jesus|christ|testament|psalms|enoch|catechism|coran|qur'?an|hadith|islamic|prophet|torah|jewish|judaism|buddha|buddhism|zen|meditation|spiritual|spirituality|soufisme|dao de jing|tao te ching|i ching/)) {
        return { category: 'Religion & Spiritualité', subCategory: 'Spiritualité', autoClassified: true }
    }

    // 5. Business, Finance & Entrepreneuriat
    if (text.match(/investing|finance|trading|crypto|bitcoin|bourse|millionaire|fastlane|wealth|entrepreneur|startup|marketing|sales|business|management|e-commerce|naval ravikant|rich dad|poor dad|cashflow|peter thiel|alex hormozi|psychology of money|wall street/)) {
        return { category: 'Business & Finance', subCategory: 'Business', autoClassified: true }
    }

    // 6. Développement Personnel & Psychologie
    if (text.match(/atomic habits|habits|habitudes|ikigai|mindset|willpower|subtle art|deep work|shadow work|anxiety|depression|cbt|emotional intelligence|self-help|overcoming|dbt|dsm-5|psycho|psychologie|psychology|as a man thinketh|james clear|robert greene|mark manson|dale carnegie|robin sharma|eckhart tolle|vex king|cal newport|brené brown|jordan peterson|5 love languages|read people like a book|body language|limitless/)) {
        return { category: 'Développement Personnel', subCategory: 'Psychologie', autoClassified: true }
    }

    // 7. Philosophie & Sciences Humaines
    if (text.match(/philosophy|philosophie|philosophe|philosopher|descartes|spinoza|nietzsche|kierkegaard|aristotle|aristote|plato|platon|socrate|marcus aurelius|kant|hegel|camus|sartre|zarathustra|machiavelli|sociologie|anthropologie|epicurean/)) {
        return { category: 'Philosophie & Sciences Humaines', subCategory: 'Philosophie', autoClassified: true }
    }

    // 8. Vie pratique, Santé, Famille & Maison
    if (text.match(/cuisine|recettes|cookbook|cooking|nutrition|diet|santé|health|yoga|fitness|grossesse|pregnancy|childbirth|parenting|parents|motherhood|fatherhood|montessori|bricolage|jardinage|gardening|hiking|plants|herbs/)) {
        return { category: 'Vie pratique', subCategory: 'Santé & Bien-être', autoClassified: true }
    }

    // 9. Scolaire & Pédagogie
    if (text.match(/scolaire|parascolaire|manuel|workbook|grammar|grammaire|conjugaison|dictionnaire|dictionary|math tests|baccalauréat|brevet|cours de langue|apprendre l'anglais/)) {
        return { category: 'Scolaire et Pédagogie', subCategory: 'Parascolaire', autoClassified: true }
    }

    // 10. Fiction Anglaise vs Fiction Française
    if (text.match(/novel|romance|thriller|mystery|fiction|murder|love story|fantasy|sci-fi|colleen hoover|tessa bailey|stephen king|sarah j\. maas|lucy score|ali hazelwood|harry potter|sopranos|hunger games/)) {
        if (lang === 'en' || /[a-zA-Z]/.test(title)) {
            return { category: 'English Fiction', subCategory: 'Litterature in English', autoClassified: true }
        }
        return { category: 'Romans & Littérature', subCategory: 'Romans étrangers traduits', autoClassified: true }
    }

    // 11. Fiction Française / Romans
    if (text.match(/roman|romans|polar|thriller|littérature|poésie|guillaume musso|marc levy|michel bussi|mélissa da costa|virginie grimaldi|albert camus|victor hugo|émile zola|marcel proust|amélie nothomb|amin maalouf/)) {
        return { category: 'Romans & Littérature', subCategory: 'Romans froncophones', autoClassified: true }
    }

    // Fallback par défaut selon la langue
    if (lang === 'en') {
        return { category: 'English Non-Fiction', subCategory: 'Humanities', autoClassified: true }
    }

    return { category: 'Romans & Littérature', subCategory: 'Littérature', autoClassified: true }
}
