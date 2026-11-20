// Service DeepL - traduction automatique de textes
// Supporte FR, EN, AR (via EN comme pivot pour l'arabe)

const DEEPL_API_KEY = process.env.DEEPL_API_KEY
// Utiliser l'URL free si la clé se termine par :fx
const getApiUrl = () => {
    if (!DEEPL_API_KEY) return null
    return DEEPL_API_KEY.endsWith(':fx')
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate'
}

type DeepLLang = 'FR' | 'EN' | 'AR' | 'EN-US' | 'DE' | 'ES'

interface TranslateOptions {
    texts: string[]
    targetLang: DeepLLang
    sourceLang?: DeepLLang
}

interface TranslateResult {
    success: boolean
    translations?: string[]
    error?: string
}

// Traduire via l'API DeepL
export async function translateWithDeepl({ texts, targetLang, sourceLang }: TranslateOptions): Promise<TranslateResult> {
    const apiUrl = getApiUrl()
    if (!apiUrl || !DEEPL_API_KEY) {
        return { success: false, error: 'DEEPL_API_KEY non configurée' }
    }

    // DeepL ne supporte pas l'arabe, on retourne une erreur claire
    if (targetLang === 'AR') {
        return { success: false, error: "DeepL ne supporte pas l'arabe. Traduisez manuellement." }
    }

    try {
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: texts,
                target_lang: targetLang,
                ...(sourceLang ? { source_lang: sourceLang } : {}),
            }),
        })

        if (!res.ok) {
            const err = await res.text()
            return { success: false, error: `DeepL error ${res.status}: ${err}` }
        }

        const data = await res.json()
        const translations = data.translations.map((t: any) => t.text)
        return { success: true, translations }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

interface RephraseOptions {
    text: string[]
    targetLang: string
    style?: string
    tone?: string
}

export async function rephraseWithDeepl({ text, targetLang, style, tone }: RephraseOptions): Promise<TranslateResult> {
    const apiUrl = getApiUrl()?.replace('/translate', '/write/rephrase')
    if (!apiUrl || !DEEPL_API_KEY) {
        return { success: false, error: 'DEEPL_API_KEY non configurée' }
    }

    // Map 'fr' to 'FR', etc. DeepL target_lang for write is EN-US, EN-GB, DE, FR.
    let lang = targetLang.toUpperCase()
    if (lang === 'EN') lang = 'EN-US'
    if (lang === 'AR') return { success: false, error: 'DeepL Write ne supporte pas l\'arabe.' }

    try {
        const body: any = {
            text,
            target_lang: lang,
        }
        if (style && style !== 'default') body.writing_style = style
        if (tone && tone !== 'default') body.tone = tone

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!res.ok) {
            const err = await res.text()
            return { success: false, error: `DeepL error ${res.status}: ${err}` }
        }

        const data = await res.json()
        const translations = data.improvements ? data.improvements.map((t: any) => t.text) : data.translations?.map((t: any) => t.text)
        return { success: true, translations }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Traduire un livre : depuis l'arabe vers FR et EN
export async function translateBookFields(fields: {
    title?: string
    description?: string
    sourceLang?: DeepLLang
}): Promise<{
    titleFr?: string
    titleEn?: string
    descriptionFr?: string
    descriptionEn?: string
    errors: string[]
}> {
    const errors: string[] = []
    const result: any = {}

    const textsToTranslate: string[] = []
    const fieldMap: string[] = []

    if (fields.title) { textsToTranslate.push(fields.title); fieldMap.push('title') }
    if (fields.description) { textsToTranslate.push(fields.description); fieldMap.push('description') }

    if (textsToTranslate.length === 0) return { errors: ['Aucun texte à traduire'] }

    // Traduction vers FR
    const frResult = await translateWithDeepl({
        texts: textsToTranslate,
        targetLang: 'FR',
        sourceLang: fields.sourceLang,
    })

    if (frResult.success && frResult.translations) {
        fieldMap.forEach((field, i) => {
            if (field === 'title') result.titleFr = frResult.translations![i]
            if (field === 'description') result.descriptionFr = frResult.translations![i]
        })
    } else {
        errors.push(`FR: ${frResult.error}`)
    }

    // Traduction vers EN
    const enResult = await translateWithDeepl({
        texts: textsToTranslate,
        targetLang: 'EN',
        sourceLang: fields.sourceLang,
    })

    if (enResult.success && enResult.translations) {
        fieldMap.forEach((field, i) => {
            if (field === 'title') result.titleEn = enResult.translations![i]
            if (field === 'description') result.descriptionEn = enResult.translations![i]
        })
    } else {
        errors.push(`EN: ${enResult.error}`)
    }

    return { ...result, errors }
}
