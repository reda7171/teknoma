'use server'

import { prisma } from '@/lib/prisma'
import { JumiaAPI } from '@/lib/jumia-api'
import { verifyAdmin } from './auth'
import { sendTelegramMessage } from '@/lib/telegram'
import { getSetting } from './site-settings'

export async function fetchPaidPayoutStatements() {
    try {
        await verifyAdmin()
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré.", statements: [] }
        }

        // Fetch paid statements (maybe recent ones, last 90 days is default)
        const response = await jumia.getPayoutStatements({ paid: true })
        if (response && response.statements) {
            let newPayoutsCount = 0;
            const shouldNotify = await getSetting('telegram_notify_jumia_payout') === 'true'

            for (const statement of response.statements) {
                const existing = await prisma.expense.findFirst({
                    where: {
                        category: 'INCOME_JUMIA',
                        description: statement.statementNumber
                    }
                })

                if (!existing && statement.payout?.amount) {
                    await prisma.expense.create({
                        data: {
                            title: `Virement Jumia - ${statement.statementNumber}`,
                            description: statement.statementNumber,
                            amount: statement.payout.amount,
                            category: 'INCOME_JUMIA',
                            type: 'INCOME',
                            date: new Date(statement.createdAt)
                        }
                    })
                    newPayoutsCount++;

                    if (shouldNotify) {
                        await sendTelegramMessage(`💰 <b>Nouveau Virement Jumia Enregistré</b>\n\n📌 <b>Référence:</b> ${statement.statementNumber}\n💵 <b>Montant:</b> ${statement.payout.amount} ${statement.payout.currency}\n📅 <b>Date:</b> ${new Date(statement.createdAt).toLocaleDateString('fr-FR')}`)
                    }
                }
            }

            return { success: true, statements: response.statements, newPayoutsCount }
        }
        return { success: false, message: "Aucune facture trouvée", statements: [] }
    } catch (error: any) {
        console.error("fetchPaidPayoutStatements error:", error)
        return { success: false, message: error.message, statements: [] }
    }
}

export async function syncBooksStockToJumia() {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré ou activé." }
        }

        // Récupérer les livres avec ISBN ou ID (en fonction de ce qui est utilisé comme SellerSku sur Jumia)
        const books = await prisma.book.findMany({
            where: { active: true, sellerSku: { not: null }, isSyncedWithJumia: true },
            select: { id: true, sellerSku: true, stock: true, jumiaProductSid: true, jumiaQcStatus: true }
        })

        if (books.length === 0) {
            return { success: true, message: "Aucun livre à synchroniser avec Jumia (sellerSku manquant ou non synchronisé)." }
        }

        const updates: any[] = []
        for (const book of books) {
            try {
                let sid = (book as any).jumiaProductSid;
                let sellerSku = book.sellerSku as string;
                
                if (!sid) {
                    const cleanSku = (book.sellerSku as string).trim();
                    let data = await jumia.getProducts({ sellerSku: cleanSku })
                    let product = data?.products?.[0] || data?.data?.[0] || data?.[0]
                    
                    if (!product || !product.id) {
                        data = await jumia.getProducts({ sellerSku: cleanSku + '_v2' })
                        product = data?.products?.[0] || data?.data?.[0] || data?.[0]
                    }
                    
                    const variation = product?.variations?.find((v: any) => v.sellerSku?.trim() === (book.sellerSku as string).trim() || v.sellerSku?.trim() === (book.sellerSku as string).trim() + '_v2')
                    sid = variation?.id || product?.id
                    sellerSku = variation?.sellerSku?.trim() || book.sellerSku as string
                }
                
                if (sid) {
                    updates.push({
                        id: sid,
                        sellerSku: sellerSku,
                        stock: book.stock
                    })
                }
            } catch (err) {
                console.error("Error fetching SID for", book.sellerSku, err)
            }
        }

        if (updates.length === 0) {
            return { success: false, message: "Impossible de récupérer les identifiants Jumia (PRODUCT_SID) pour ces produits." }
        }

        const result = await jumia.updateProductsStock(updates)

        if (result?.feedId || result?.SuccessResponse) {
            return { success: true, message: `${books.length} livres synchronisés avec succès avec Jumia.` }
        } else {
            return { success: false, message: result?.error || result?.ErrorResponse?.Head?.ErrorMessage || "Erreur de synchronisation Jumia" }
        }
    } catch (error: any) {
        return { success: false, message: `Erreur: ${error.message}` }
    }
}

export async function syncBooksQuantityToJumia(bookIds: string[]) {
    try {
        await verifyAdmin()
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré ou activé." }
        }

        const books = await prisma.book.findMany({
            where: { id: { in: bookIds }, sellerSku: { not: null } }
        })

        if (books.length === 0) {
            return { success: false, message: "Aucun livre trouvé avec un SKU Jumia." }
        }

        const updates: any[] = []
        for (const book of books) {
            try {
                let sid = book.jumiaProductSid;
                let sellerSku = book.sellerSku as string;
                
                if (!sid) {
                    const cleanSku = (book.sellerSku as string).trim();
                    let data = await jumia.getProducts({ sellerSku: cleanSku })
                    let product = data?.products?.[0] || data?.data?.[0] || data?.[0]
                    
                    if (!product || !product.id) {
                        data = await jumia.getProducts({ sellerSku: cleanSku + '_v2' })
                        product = data?.products?.[0] || data?.data?.[0] || data?.[0]
                    }
                    
                    const variation = product?.variations?.find((v: any) => v.sellerSku?.trim() === (book.sellerSku as string).trim() || v.sellerSku?.trim() === (book.sellerSku as string).trim() + '_v2')
                    sid = variation?.id || product?.id
                    sellerSku = variation?.sellerSku?.trim() || book.sellerSku as string
                }
                
                if (sid) {
                    updates.push({
                        id: sid,
                        sellerSku: sellerSku,
                        stock: book.stock
                    })
                }
            } catch (err) {
                console.error("Error fetching SID for", book.sellerSku, err)
            }
        }

        if (updates.length === 0) {
            return { success: false, message: "Impossible de récupérer les identifiants Jumia (PRODUCT_SID) pour ces produits." }
        }

        const result = await jumia.updateProductsStock(updates)

        if (result?.feedId) {
            // Update local DB instantly to match what we sent
            for (const book of books) {
                await prisma.book.updateMany({
                    where: { id: book.id },
                    data: { jumiaStock: book.stock }
                })
            }
            return { success: true, message: "Stock synchronisé avec Jumia" }
        }

        return { success: false, message: "Échec de la synchronisation du stock." }
    } catch (error: any) {
        return { success: false, message: `Erreur: ${error.message}` }
    }
}


function cleanJumiaProductName(name: string): string {
    if (!name) return ''
    return name
        .replace(/[|]/g, ' - ')
        .replace(/[<>{}[\]~^\\_*+=#$@!?;"]/g, ' ')
        .replace(/\s*-\s*-\s*/g, ' - ')
        .replace(/\s+/g, ' ')
        .trim()
}

export async function publishBooksToJumia(bookIds: string[], targetLang: 'all' | 'fr' | 'ar' | 'en' = 'all') {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré ou activé." }
        }

        const books = await prisma.book.findMany({
            where: { id: { in: bookIds } }
        })

        if (books.length === 0) {
            return { success: false, message: "Aucun livre trouvé pour publication." }
        }

        const shops = await jumia.getShops()
        const shopId = shops?.data?.[0]?.id || shops?.[0]?.id || "UNKNOWN_SHOP_ID"
        const productsToCreate: any[] = [];
        const productsToUpdate: any[] = [];

        for (const book of books) {
            const hasArabic = (str: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(str);
            const rawTitleAr = book.title || book.titleEn || book.titleFr || `Livre ${book.id.substring(0, 8)}`;
            const titleAr = cleanJumiaProductName(rawTitleAr).substring(0, 60).replace(/[-:,]+$/, '').trim();

            let rawTitleFr = book.titleFr || book.titleEn || `Livre - ${book.sellerSku || book.id.substring(0, 8)}`;
            if (hasArabic(rawTitleFr)) rawTitleFr = `Livre - ${book.sellerSku || book.id.substring(0, 8)}`;
            const titleFr = cleanJumiaProductName(rawTitleFr).substring(0, 60).replace(/[-:,]+$/, '').trim();

            const descArRaw = book.description || book.descriptionEn || book.descriptionFr || titleAr;
            let descFrRaw = book.descriptionFr || book.descriptionEn || book.longDescription || `Un excellent livre - ${book.sellerSku || book.id.substring(0, 8)}`;
            if (hasArabic(descFrRaw)) descFrRaw = `Un excellent livre à lire - ${book.sellerSku || book.id.substring(0, 8)}`;

            const padDesc = (desc: string) => {
                const suffix = " - Découvrez ce livre fascinant qui viendra enrichir votre bibliothèque. Une excellente qualité pour des heures de lecture agréables et captivantes.";
                const padded = desc.length >= 50 ? desc.substring(0, 9000) : (desc + " " + suffix).substring(0, 9000);
                return padded.replace(/\n/g, '<br/>');
            };

            const descAr = padDesc(descArRaw);
            const descFr = padDesc(descFrRaw);

            const markupMultiplier = 1 + ((book.jumiaPriceMarkup || 0) / 100);

            const baseName = titleFr.padEnd(15, ' ').substring(0, 60);
            const baseDesc = padDesc(descFr);

            const rawTitleEn = book.titleEn || book.titleFr || book.title || `Livre - ${book.sellerSku || book.id.substring(0, 8)}`;
            const titleEn = cleanJumiaProductName(rawTitleEn).substring(0, 60).replace(/[-:,]+$/, '').trim();
            const descEnRaw = book.descriptionEn || book.descriptionFr || book.description || `A great book to read - ${book.sellerSku || book.id.substring(0, 8)}`;
            const descEn = padDesc(descEnRaw);

            let primaryName = baseName;
            let primaryDesc = baseDesc;
            let nameTranslations: Array<{ language: string; value: string }> = [];
            let descTranslations: Array<{ language: string; value: string }> = [];

            if (targetLang === 'ar') {
                primaryName = (titleAr || baseName).padEnd(15, ' ').substring(0, 60);
                primaryDesc = descAr;
                nameTranslations = [{ language: "AR", value: titleAr.substring(0, 60) }];
                descTranslations = [{ language: "AR", value: descAr }];
            } else if (targetLang === 'fr') {
                primaryName = titleFr.padEnd(15, ' ').substring(0, 60);
                primaryDesc = descFr;
                nameTranslations = [{ language: "FR", value: titleFr.substring(0, 60) }];
                descTranslations = [{ language: "FR", value: descFr }];
            } else if (targetLang === 'en') {
                primaryName = titleEn.padEnd(15, ' ').substring(0, 60);
                primaryDesc = descEn;
                nameTranslations = [{ language: "EN", value: titleEn.substring(0, 60) }];
                descTranslations = [{ language: "EN", value: descEn }];
            } else {
                primaryName = baseName;
                primaryDesc = baseDesc;
                nameTranslations = [
                    { language: "AR", value: titleAr.substring(0, 60) },
                    { language: "FR", value: titleFr.substring(0, 60) }
                ];
                descTranslations = [
                    { language: "AR", value: descAr },
                    { language: "FR", value: descFr }
                ];
                if (book.titleEn) {
                    nameTranslations.push({ language: "EN", value: titleEn.substring(0, 60) });
                }
                if (book.descriptionEn) {
                    descTranslations.push({ language: "EN", value: descEn });
                }
            }

            const payload: any = {
                name: {
                    value: primaryName, // Length must be 15-60
                    translations: nameTranslations
                },
                description: {
                    value: primaryDesc,
                    translations: descTranslations
                },
                parentSku: book.id,
                sellerSku: book.sellerSku || book.isbn || book.id,
                gtinBarcode: book.isbn || undefined,
                variation: "1",
                brand: {
                    code: 1045133,
                    name: "Generic"
                },
                category: {
                    code: 1000203,
                    name: "Bestselling Books"
                },
                images: book.image ? [{
                    url: book.image.startsWith('/') ? `https://riwaya.store${book.image}` : book.image,
                    primary: true
                }] : [],
                price: {
                    currency: "MAD",
                    value: Math.ceil((book.originalPrice || book.price) * markupMultiplier),
                    salePrice: (book.originalPrice && book.originalPrice > book.price) ? {
                        value: Math.ceil(book.price * markupMultiplier),
                        startAt: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                        endAt: new Date(Date.now() + 31536000000).toISOString().split('T')[0]
                    } : undefined
                },
                stock: book.stock,
                attributes: [
                    {
                        name: "isbn",
                        value: book.isbn || "N/A"
                    },
                    {
                        name: "short_description",
                        value: (book.jumiaHighlights || `<ul><li>Titre: ${book.title}</li><li>Auteur: ${book.author}</li><li>Type: Livre</li></ul>`).replace(/\|/g, '-')
                    },
                    {
                        name: "package_content",
                        value: (book.jumiaPackageContent || `1 x Livre : ${book.title}`).replace(/\|/g, '-')
                    },
                    {
                        name: "model",
                        value: "Standard"
                    },
                    {
                        name: "product_weight",
                        value: "0.5"
                    }
                ]
            };
            let productId = null;
            try {
                // Toujours vérifier si le produit existe sur Jumia via l'API, 
                // même si isSyncedWithJumia est false dans notre base de données.
                const jumiaProd = await jumia.getProducts({ sellerSku: payload.sellerSku });
                productId = jumiaProd?.products?.[0]?.id || jumiaProd?.products?.[0]?.sid || jumiaProd?.data?.[0]?.sid || jumiaProd?.[0]?.sid;
            } catch (err) {
                console.error("Error fetching productId for", payload.sellerSku, err);
            }

            if (productId) {
                payload.id = productId;
                productsToUpdate.push(payload);
            } else {
                productsToCreate.push(payload);
            }
        }

        let createResponse: any = null;
        let updateResponse: any = null;

        if (productsToCreate.length > 0) {
            createResponse = await jumia.createProducts(shopId, productsToCreate);
        }

        if (productsToUpdate.length > 0) {
            updateResponse = await jumia.updateProducts(productsToUpdate, shopId);
        }

        const checkFeed = async (response: any) => {
            if (response?.feedId) {
                // Wait briefly to see if it processes immediately (often does for errors)
                await new Promise(r => setTimeout(r, 2500))
                const feedRes = await jumia.getFeed(response.feedId)

                if (feedRes?.status === 'FAILED') {
                    const itemError = feedRes.feedItems?.[0]?.errorMessage || 'Erreurs de validation'
                    const globalErrors = feedRes.feedItems?.[0]?.errors?.globalMessages?.join(', ') || ''
                    return `Jumia a rejeté le produit: ${itemError} ${globalErrors}`.trim()
                }
            }
            return null;
        };

        const error1 = createResponse ? await checkFeed(createResponse) : null;
        const error2 = updateResponse ? await checkFeed(updateResponse) : null;

        if (error1 || error2) {
            return {
                success: false,
                message: [error1, error2].filter(Boolean).join(' | ')
            }
        }

        // Mettre à jour le statut isSyncedWithJumia dans la base de données
        await prisma.book.updateMany({
            where: { id: { in: bookIds } },
            data: { isSyncedWithJumia: true }
        });

        const feedIds = [createResponse?.feedId, updateResponse?.feedId].filter(Boolean).join(', ');
        return { success: true, message: `${books.length} livre(s) envoyés pour publication/mise à jour sur Jumia. (Feed IDs: ${feedIds})` }
    } catch (error: any) {
        console.error("Erreur publishBooksToJumia:", error)
        return { success: false, message: `Erreur de publication: ${error.message}` }
    }
}

export async function publishPacksToJumia(packIds: string[], targetLang: 'all' | 'fr' | 'ar' | 'en' = 'all') {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré ou activé." }
        }

        const packs: any[] = await prisma.pack.findMany({
            where: { id: { in: packIds } },
            include: { books: { include: { book: true } } }
        })

        if (packs.length === 0) {
            return { success: true, message: "Aucun pack trouvé pour publication." }
        }

        // Contrôle anti-doublon Jumia basé sur la composition réelle (IDs et titres des livres)
        const allSyncedPacks = await prisma.pack.findMany({
            where: {
                id: { notIn: packIds },
                OR: [
                    { isSyncedWithJumia: true },
                    { jumiaProductSid: { not: null } }
                ]
            },
            include: {
                books: { include: { book: { select: { id: true, title: true } } } },
                extraProducts: true
            }
        });

        const getBookIdsSignature = (p: any) => {
            const bIds = (p.books || []).map((b: any) => b.bookId).sort().join('|');
            const eIds = (p.extraProducts || []).map((e: any) => e.extraProductId).sort().join('|');
            return `${bIds}#${eIds}`;
        };

        const getTitlesSignature = (p: any) => {
            return (p.books || [])
                .map((b: any) => (b.book?.title || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''))
                .filter(Boolean)
                .sort()
                .join('|');
        };

        for (const currentPack of packs) {
            const currentIdSig = getBookIdsSignature(currentPack);
            const currentTitleSig = getTitlesSignature(currentPack);

            const duplicate = allSyncedPacks.find(sp => {
                const spIdSig = getBookIdsSignature(sp);
                const spTitleSig = getTitlesSignature(sp);
                return (currentIdSig && spIdSig && currentIdSig === spIdSig) ||
                       (currentTitleSig && spTitleSig && currentTitleSig === spTitleSig);
            });

            if (duplicate) {
                return {
                    success: false,
                    message: `Publication Jumia refusée pour doublon (Duplicate SEO variant) : Le pack "${currentPack.name}" a exactement la même composition de livres que le pack "${duplicate.name}" déjà actif sur Jumia. Veuillez modifier au moins un livre ou ajouter un accessoire distinct.`
                };
            }
        }

        const shops = await jumia.getShops()
        const shopId = shops?.data?.[0]?.id || shops?.[0]?.id || "UNKNOWN_SHOP_ID"
        const productsToCreate: any[] = [];
        const productsToUpdate: any[] = [];

        for (const rawPack of packs) {
            const pack = rawPack as any;
            const hasArabic = (str: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(str);
            const rawTitleAr = pack.name || pack.nameEn || pack.nameFr || `Pack ${pack.id.substring(0, 8)}`;
            const titleAr = cleanJumiaProductName(rawTitleAr).substring(0, 60).replace(/[-:,]+$/, '').trim();

            let rawTitleFr = pack.nameFr || pack.nameEn || `Pack - ${pack.sellerSku || pack.id.substring(0, 8)}`;
            if (hasArabic(rawTitleFr)) rawTitleFr = `Pack - ${pack.sellerSku || pack.id.substring(0, 8)}`;
            const titleFr = cleanJumiaProductName(rawTitleFr).substring(0, 60).replace(/[-:,]+$/, '').trim();

            const descArRaw = pack.description || pack.descriptionEn || pack.descriptionFr || titleAr;
            let descFrRaw = pack.descriptionFr || pack.descriptionEn || pack.description || `Un excellent pack - ${pack.sellerSku || pack.id.substring(0, 8)}`;
            if (hasArabic(descFrRaw)) descFrRaw = `Un excellent pack de livres - ${pack.sellerSku || pack.id.substring(0, 8)}`;

            const padDesc = (desc: string) => {
                const suffix = " - Découvrez ce pack fascinant qui viendra enrichir votre bibliothèque. Une excellente qualité pour des heures de lecture agréables et captivantes.";
                const padded = desc.length >= 50 ? desc.substring(0, 9000) : (desc + " " + suffix).substring(0, 9000);
                return padded.replace(/\n/g, '<br/>');
            };

            const descAr = padDesc(descArRaw);
            const descFr = padDesc(descFrRaw);

            const markupMultiplier = 1 + ((pack.jumiaPriceMarkup || 0) / 100);

            const baseName = titleFr.padEnd(15, ' ').substring(0, 60);
            const baseDesc = padDesc(descFr);

            const rawTitleEn = pack.nameEn || pack.nameFr || pack.name || `Pack - ${pack.sellerSku || pack.id.substring(0, 8)}`;
            const titleEn = cleanJumiaProductName(rawTitleEn).substring(0, 60).replace(/[-:,]+$/, '').trim();
            const descEnRaw = pack.descriptionEn || pack.descriptionFr || pack.description || `A great book pack - ${pack.sellerSku || pack.id.substring(0, 8)}`;
            const descEn = padDesc(descEnRaw);

            let primaryName = baseName;
            let primaryDesc = baseDesc;
            let nameTranslations: Array<{ language: string; value: string }> = [];
            let descTranslations: Array<{ language: string; value: string }> = [];

            if (targetLang === 'ar') {
                primaryName = (titleAr || baseName).padEnd(15, ' ').substring(0, 60);
                primaryDesc = descAr;
                nameTranslations = [{ language: "AR", value: titleAr.substring(0, 60) }];
                descTranslations = [{ language: "AR", value: descAr }];
            } else if (targetLang === 'fr') {
                primaryName = titleFr.padEnd(15, ' ').substring(0, 60);
                primaryDesc = descFr;
                nameTranslations = [{ language: "FR", value: titleFr.substring(0, 60) }];
                descTranslations = [{ language: "FR", value: descFr }];
            } else if (targetLang === 'en') {
                primaryName = titleEn.padEnd(15, ' ').substring(0, 60);
                primaryDesc = descEn;
                nameTranslations = [{ language: "EN", value: titleEn.substring(0, 60) }];
                descTranslations = [{ language: "EN", value: descEn }];
            } else {
                primaryName = baseName;
                primaryDesc = baseDesc;
                nameTranslations = [
                    { language: "AR", value: titleAr.substring(0, 60) },
                    { language: "FR", value: titleFr.substring(0, 60) }
                ];
                descTranslations = [
                    { language: "AR", value: descAr },
                    { language: "FR", value: descFr }
                ];
                if (pack.nameEn) {
                    nameTranslations.push({ language: "EN", value: titleEn.substring(0, 60) });
                }
                if (pack.descriptionEn) {
                    descTranslations.push({ language: "EN", value: descEn });
                }
            }

            const calculatedStock = pack.books.length > 0
                ? Math.min(...pack.books.map(b => b.book.stock))
                : 0;

            // Vérification et fallback de l'image principale pour Jumia (évite le rejet 404 si image locale)
            let primaryImageUrl = pack.image ? (pack.image.startsWith('/') ? `https://riwaya.store${pack.image}` : pack.image) : '';
            if (primaryImageUrl) {
                try {
                    const imgCheck = await fetch(primaryImageUrl, { method: 'HEAD' });
                    if (!imgCheck.ok) {
                        const firstBookImg = pack.books?.[0]?.book?.image;
                        if (firstBookImg) {
                            primaryImageUrl = firstBookImg.startsWith('/') ? `https://riwaya.store${firstBookImg}` : firstBookImg;
                        }
                    }
                } catch {
                    const firstBookImg = pack.books?.[0]?.book?.image;
                    if (firstBookImg) {
                        primaryImageUrl = firstBookImg.startsWith('/') ? `https://riwaya.store${firstBookImg}` : firstBookImg;
                    }
                }
            } else if (pack.books?.[0]?.book?.image) {
                const firstBookImg = pack.books[0].book.image;
                primaryImageUrl = firstBookImg.startsWith('/') ? `https://riwaya.store${firstBookImg}` : firstBookImg;
            }

            const payload: any = {
                name: {
                    value: primaryName,
                    translations: nameTranslations
                },
                description: {
                    value: primaryDesc,
                    translations: descTranslations
                },
                parentSku: pack.id + "_v2",
                sellerSku: (pack.sellerSku || pack.id) + "_v2",
                variation: "1",
                brand: {
                    code: 1045133,
                    name: "Generic"
                },
                category: {
                    code: 1000203,
                    name: "Bestselling Books"
                },
                images: primaryImageUrl ? [{
                    url: primaryImageUrl,
                    primary: true
                }] : [],
                price: {
                    currency: "MAD",
                    value: Math.ceil((pack.originalPrice || pack.price) * markupMultiplier),
                    salePrice: (pack.originalPrice && pack.originalPrice > pack.price) ? {
                        value: Math.ceil(pack.price * markupMultiplier),
                        startAt: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Demain
                        endAt: new Date(Date.now() + 31536000000).toISOString().split('T')[0]
                    } : undefined
                },
                stock: pack.jumiaStock ?? calculatedStock,
                attributes: [
                    {
                        name: "short_description",
                        value: (() => {
                            const p = pack as any;
                            const hlAr = p.jumiaHighlightsAr || p.jumiaHighlights;
                            const hlEn = p.jumiaHighlightsEn || p.jumiaHighlights;
                            const hlFr = p.jumiaHighlightsFr || p.jumiaHighlights;
                            const hl = targetLang === 'ar' ? hlAr : targetLang === 'en' ? hlEn : hlFr;
                            return hl ? String(hl).replace(/\|/g, '-') : `<ul><li>Titre: ${cleanJumiaProductName(p.name)}</li><li>Type: Pack de Livres</li></ul>`;
                        })()
                    },
                    {
                        name: "package_content",
                        value: (() => {
                            const p = pack as any;
                            const pcAr = p.jumiaPackageContentAr || p.jumiaPackageContent;
                            const pcEn = p.jumiaPackageContentEn || p.jumiaPackageContent;
                            const pcFr = p.jumiaPackageContentFr || p.jumiaPackageContent;
                            const pc = targetLang === 'ar' ? pcAr : targetLang === 'en' ? pcEn : pcFr;
                            return pc ? String(pc).replace(/\|/g, '-') : `1 x Pack de livres : ${cleanJumiaProductName(p.name)}`;
                        })()
                    },
                    {
                        name: "model",
                        value: "Standard"
                    },
                    {
                        name: "product_weight",
                        value: "1.5"
                    },
                    {
                        name: "isbn",
                        value: "0000000000"
                    }
                ]
            };

            /*let productId = null;
            try {
                const jumiaProd = await jumia.getProducts({ sellerSku: payload.sellerSku });
                productId = jumiaProd?.products?.[0]?.id || jumiaProd?.products?.[0]?.sid || jumiaProd?.data?.[0]?.sid || jumiaProd?.[0]?.sid;
            } catch (err) {
                console.error("Error fetching productId for pack", payload.sellerSku, err);
            }
            
            if (productId) {
                // payload.id = productId; // Let Jumia match by sellerSku
                productsToUpdate.push(payload);
            } else {*/
            productsToCreate.push(payload);
            //}
        }

        let createResponse: any = null;
        let updateResponse: any = null;

        if (productsToCreate.length > 0) {
            createResponse = await jumia.createProducts(shopId, productsToCreate);
        }

        if (productsToUpdate.length > 0) {
            updateResponse = await jumia.updateProducts(productsToUpdate, shopId);
        }

        const checkFeed = async (response: any) => {
            if (response?.feedId) {
                await new Promise(r => setTimeout(r, 2500))
                const feedRes = await jumia.getFeed(response.feedId)
                if (feedRes?.status === 'FAILED') {
                    const itemError = feedRes.feedItems?.[0]?.errorMessage || 'Erreurs de validation'
                    const globalErrors = feedRes.feedItems?.[0]?.errors?.globalMessages?.join(', ') || ''
                    return `Jumia a rejeté le pack: ${itemError} ${globalErrors}`.trim()
                }
            }
            return null;
        };

        const error1 = createResponse ? await checkFeed(createResponse) : null;
        const error2 = updateResponse ? await checkFeed(updateResponse) : null;

        if (error1 || error2) {
            return {
                success: false,
                message: [error1, error2].filter(Boolean).join(' | ')
            }
        }

        await prisma.pack.updateMany({
            where: { id: { in: packIds } },
            data: { isSyncedWithJumia: true }
        });

        const feedIds = [createResponse?.feedId, updateResponse?.feedId].filter(Boolean).join(', ');
        return { success: true, message: `${packs.length} pack(s) envoyés pour publication/mise à jour sur Jumia. (Feed IDs: ${feedIds})` }
    } catch (error: any) {
        console.error("Erreur publishPacksToJumia:", error)
        return { success: false, message: `Erreur de publication: ${error.message}` }
    }
}

export async function publishAccessoriesToJumia(accessoryIds: string[]) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré ou activé." }
        }

        const accessories = await prisma.extraProduct.findMany({
            where: { id: { in: accessoryIds } }
        })

        if (accessories.length === 0) {
            return { success: true, message: "Aucun accessoire trouvé pour publication." }
        }

        const shops = await jumia.getShops()
        const shopId = shops?.data?.[0]?.id || shops?.[0]?.id || "UNKNOWN_SHOP_ID"
        const productsToCreate: any[] = [];
        const productsToUpdate: any[] = [];

        for (const accessory of accessories) {
            const titleFr = accessory.name;
            const descFrRaw = accessory.description || titleFr;

            const padDesc = (desc: string) => {
                const suffix = " - Découvrez cet accessoire exclusif, parfait pour enrichir votre quotidien. Design unique et finition soignée garantie.";
                return desc.length >= 50 ? desc.substring(0, 9000) : (desc + " " + suffix).substring(0, 9000);
            };

            const descFr = padDesc(descFrRaw);

            // Accessoires usually don't have markup, just use their price
            const price = accessory.price;

            const baseName = (titleFr && /[a-zA-Z]/.test(titleFr)) ? titleFr : `Accessory - ${accessory.sellerSku || accessory.id.substring(0, 8)}`;
            const baseDesc = (descFr && /[a-zA-Z]/.test(descFr)) ? descFr : `Quality accessory - ${accessory.sellerSku || accessory.id.substring(0, 8)}`;

            const accessoryImages = Array.isArray(accessory.images) ? (accessory.images as string[]) : [];
            const primaryAccImg = accessory.image || (accessoryImages.length > 0 ? accessoryImages[0] : null);

            const payload: any = {
                name: {
                    value: baseName.padEnd(15, ' ').substring(0, 60),
                    translations: [
                        { language: "FR", value: titleFr.substring(0, 60) }
                    ]
                },
                description: {
                    value: padDesc(baseDesc),
                    translations: [
                        { language: "FR", value: descFr }
                    ]
                },
                parentSku: accessory.id,
                sellerSku: accessory.sellerSku || `ACC-${accessory.id.substring(0, 8)}`,
                variation: "1",
                brand: {
                    code: 1045133,
                    name: "Generic"
                },
                category: {
                    code: 1000570, // Generic category for accessories/stationery, fallback
                    name: "Stationery & Office"
                },
                images: primaryAccImg ? [{
                    url: primaryAccImg.startsWith('/') ? `https://riwaya.store${primaryAccImg}` : primaryAccImg,
                    primary: true
                }] : [],
                price: {
                    currency: "MAD",
                    value: Math.ceil(price),
                },
                stock: accessory.stock,
                attributes: [
                    {
                        name: "short_description",
                        value: accessory.jumiaHighlights || `<ul><li>Produit: ${accessory.name}</li><li>Catégorie: ${accessory.category}</li></ul>`
                    },
                    {
                        name: "package_content",
                        value: accessory.jumiaPackageContent || `1 x ${accessory.name}`
                    },
                    {
                        name: "model",
                        value: "Standard"
                    },
                    {
                        name: "product_weight",
                        value: accessory.weight ? accessory.weight.toString() : "0.2"
                    }
                ]
            };

            let productId = null;
            try {
                const jumiaProd = await jumia.getProducts({ sellerSku: payload.sellerSku });
                productId = jumiaProd?.products?.[0]?.id || jumiaProd?.products?.[0]?.sid || jumiaProd?.data?.[0]?.sid || jumiaProd?.[0]?.sid;
            } catch (err) {
                console.error("Error fetching productId for", payload.sellerSku, err);
            }

            if (productId) {
                payload.id = productId;
                productsToUpdate.push(payload);
            } else {
                productsToCreate.push(payload);
            }
        }

        let createResponse: any = null;
        let updateResponse: any = null;

        if (productsToCreate.length > 0) {
            createResponse = await jumia.createProducts(shopId, productsToCreate);
        }

        if (productsToUpdate.length > 0) {
            updateResponse = await jumia.updateProducts(productsToUpdate, shopId);
        }

        const checkFeed = async (response: any) => {
            if (response?.feedId) {
                await new Promise(r => setTimeout(r, 2500))
                const feedRes = await jumia.getFeed(response.feedId)
                if (feedRes?.status === 'FAILED') {
                    const itemError = feedRes.feedItems?.[0]?.errorMessage || 'Erreurs de validation'
                    const globalErrors = feedRes.feedItems?.[0]?.errors?.globalMessages?.join(', ') || ''
                    return `Jumia a rejeté le produit: ${itemError} ${globalErrors}`.trim()
                }
            }
            return null;
        };

        const error1 = createResponse ? await checkFeed(createResponse) : null;
        const error2 = updateResponse ? await checkFeed(updateResponse) : null;

        if (error1 || error2) {
            return {
                success: false,
                message: [error1, error2].filter(Boolean).join(' | ')
            }
        }

        return { success: true, message: "Accessoires publiés/mis à jour avec succès sur Jumia" }
    } catch (error) {
        console.error("Erreur publishAccessoriesToJumia:", error)
        return { success: false, message: "Erreur lors de la publication." }
    }
}

export async function checkJumiaAvailability() {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré." }
        }

        let hasNextPage = true
        let token: string | undefined
        const syncedSkus = new Map<string, number>()

        // 1. Fetch all stock from Jumia
        while (hasNextPage) {
            const data = await jumia.getCatalogStock({ size: 100, token })
            if (!data || !data.products) break

            for (const item of data.products) {
                if (item.sellerSku && item.globalStock !== undefined) {
                    syncedSkus.set(item.sellerSku, item.globalStock)
                }
            }

            if (data.isLastPage === false && data.nextToken) {
                token = data.nextToken
            } else {
                hasNextPage = false
            }
        }

        if (syncedSkus.size === 0) {
            return { success: false, message: "Aucun produit trouvé sur Jumia." }
        }

        // 2. Update all Books in database
        // Reset all to false/null first
        await prisma.book.updateMany({
            data: { isSyncedWithJumia: false, jumiaStock: null }
        })

        // Then update the ones that exist on Jumia
        let updatedCount = 0
        const skuArray = Array.from(syncedSkus.entries())

        for (const [sku, stock] of skuArray) {
            const result = await prisma.book.updateMany({
                where: {
                    OR: [
                        { sellerSku: sku },
                        { id: sku } // Some fallbacks to book.id
                    ]
                },
                data: { isSyncedWithJumia: true, jumiaStock: stock }
            })
            updatedCount += result.count
        }

        // Also do the same for Packs just in case
        await prisma.pack.updateMany({
            data: { isSyncedWithJumia: false, jumiaStock: null }
        })
        for (const [sku, stock] of skuArray) {
            await prisma.pack.updateMany({
                where: { sellerSku: sku },
                data: { isSyncedWithJumia: true, jumiaStock: stock }
            })
        }

        return { success: true, message: `Synchronisation terminée. ${updatedCount} produits trouvés sur Jumia.` }
    } catch (error: any) {
        console.error("Erreur checkJumiaAvailability:", error)
        return { success: false, message: `Erreur: ${error.message}` }
    }
}

export async function verifyJumiaSku(bookId: string, sellerSku: string | null) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré." }
        }

        const skuToVerify = sellerSku || bookId;

        // Use getProducts to find the variation, then getCatalogStock to get its stock
        const dataProd = await jumia.getProducts({ sellerSku: skuToVerify })
        const productData = dataProd?.products?.[0] || dataProd?.data?.[0] || dataProd?.[0]
        const variation = productData?.variations?.find((v: any) => v.sellerSku === skuToVerify || v.sellerSku === skuToVerify + '_v2')
        const sid = variation?.id || productData?.id

        if (sid) {
            const stockData = await jumia.getCatalogStock({ productSids: [sid] })
            const product = stockData?.products?.[0]
            const stock = product?.globalStock !== undefined ? product.globalStock : null;

            await prisma.book.updateMany({
                where: { id: bookId },
                data: { isSyncedWithJumia: true, jumiaStock: stock }
            });
            await prisma.pack.updateMany({
                where: { id: bookId },
                data: { isSyncedWithJumia: true, jumiaStock: stock }
            });

            return { success: true, message: `SKU trouvé ! Stock Jumia: ${stock}`, stock }
        } else {
            await prisma.book.updateMany({
                where: { id: bookId },
                data: { isSyncedWithJumia: false, jumiaStock: null }
            });
            await prisma.pack.updateMany({
                where: { id: bookId },
                data: { isSyncedWithJumia: false, jumiaStock: null }
            });
            return { success: false, message: "SKU introuvable sur Jumia." }
        }
    } catch (error: any) {
        console.error("Erreur verifyJumiaSku:", error)
        return { success: false, message: `Erreur: ${error.message}` }
    }
}


export async function checkJumiaLinkBySku(sellerSku: string) {
    if (!sellerSku) return false
    try {
        await verifyAdmin()
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return false

        const res = await jumia.getProducts({ sellerSku })
        if (res && res.products && res.products.length > 0) {
            return true
        }
        return false
    } catch (e) {
        return false
    }
}


export async function checkJumiaLinkBySkuExact(sellerSku: string, sid?: string | null) {
    if (sellerSku) sellerSku = sellerSku.trim();
    if (!sellerSku && !sid) return false;
    try {
        await verifyAdmin();
        const jumia = await JumiaAPI.getInstance();
        if (!jumia) return false;

        if (sid) {
            const res = await jumia.getProducts({ sids: [sid] });
            if (!res.error && res.products && res.products.length > 0) return true;
        }

        if (!sellerSku) return false;

        const checkSku = async (sku: string) => {
            const res = await jumia.getProducts({ sellerSku: sku });
            if (res.error) return false;
            let products = res.products || res.data || res;
            if (!Array.isArray(products)) products = [products];
            for (const p of products) {
                if (!p) continue;
                if (p.sellerSku?.trim() === sku.trim()) return true;
                if (p.variations) {
                    for (const v of p.variations) {
                        if (v.sellerSku?.trim() === sku.trim()) return true;
                    }
                }
            }
            return false;
        }

        const found = await checkSku(sellerSku);
        if (found) return true;

        const foundV2 = await checkSku(sellerSku + '_v2');
        if (foundV2) return true;

        return false;
    } catch (error) {
        console.error('Error checking jumia link:', error);
        return false;
    }
}


export async function syncJumiaStockForBooksBackground(bookIds: string[]) {
    if (!bookIds || bookIds.length === 0) return;
    try {
        const { JumiaAPI } = await import('@/lib/jumia-api');
        const jumia = await JumiaAPI.getInstance();
        if (!jumia) return;

        const books = await prisma.book.findMany({
            where: { id: { in: bookIds }, sellerSku: { not: null } },
            select: { id: true, sellerSku: true, stock: true, isSyncedWithJumia: true, jumiaProductSid: true, jumiaQcStatus: true }
        });

        const validBooks = books.filter(b => b.sellerSku && b.isSyncedWithJumia);
        if (validBooks.length === 0) return;

        const updates: any[] = [];
        for (const book of validBooks) {
            try {
                let sid = book.jumiaProductSid;
                let sellerSku = book.sellerSku as string;
                let qcStatus = book.jumiaQcStatus;
                
                if (!sid) {
                    let data = await jumia.getProducts({ sellerSku: book.sellerSku as string })
                    let product = data?.products?.[0] || data?.data?.[0] || data?.[0]
                    
                    if (!product || !product.id) {
                        data = await jumia.getProducts({ sellerSku: book.sellerSku + '_v2' })
                        product = data?.products?.[0] || data?.data?.[0] || data?.[0]
                    }
                    
                    const variation = product?.variations?.find((v: any) => v.sellerSku === book.sellerSku || v.sellerSku === book.sellerSku + '_v2')
                    sid = variation?.id || product?.id
                    sellerSku = variation?.sellerSku || book.sellerSku as string
                    
                    const client = variation?.businessClients?.find((bc: any) => bc.code === 'jumia-ma' || bc.status)
                    qcStatus = client?.qc?.status || 'UNKNOWN'

                    if (sid) {
                        await prisma.book.updateMany({
                            where: { id: book.id },
                            data: { jumiaProductSid: sid, jumiaQcStatus: qcStatus }
                        })
                    }
                }
                
                if (sid) {
                    if (qcStatus !== 'APPROVED') {
                        console.warn(`Skipping Jumia sync for ${book.sellerSku} - QC Status is ${qcStatus}`);
                        continue;
                    }
                    updates.push({
                        id: sid,
                        sellerSku: sellerSku,
                        stock: book.stock
                    })
                }
            } catch (err) {
                console.error("Error fetching SID for background sync", book.sellerSku, err)
            }
        }

        console.log("Background syncing stock to Jumia for:", updates);
        if (updates.length > 0) {
            await jumia.updateProductsStock(updates);
        }
    } catch (err) {
        console.error("Error in syncJumiaStockForBooksBackground:", err);
    }
}

export async function deactivatePackOnJumia(packId: string) {
    try {
        await verifyAdmin()
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) return { success: false, message: "Jumia n'est pas configuré." }

        const pack = await prisma.pack.findUnique({ where: { id: packId } })
        if (!pack) return { success: false, message: "Pack introuvable." }

        let sellerSku = (pack.sellerSku || pack.id) + "_v2"

        let jumiaProd = await jumia.getProducts({ sellerSku })
        let product = jumiaProd?.products?.[0] || jumiaProd?.data?.[0] || jumiaProd?.[0]
        
        if (!product || !product.id) {
            sellerSku = pack.sellerSku || pack.id
            jumiaProd = await jumia.getProducts({ sellerSku })
            product = jumiaProd?.products?.[0] || jumiaProd?.data?.[0] || jumiaProd?.[0]
        }

        if (!product || !product.id) {
            return { success: false, message: "Impossible de trouver le pack sur Jumia." }
        }

        const createdAtStr = product.createdAt 
            ? new Date(product.createdAt).toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0]

        const response = await jumia.updateProductsStatus([
            {
                sellerSku: sellerSku,
                id: product.id,
                createdAt: createdAtStr,
                businessClients: [
                    { businessClientCode: "jumia-ma", status: "INACTIVE" }
                ]
            }
        ])

        if (response?.feedId || response?.SuccessResponse) {
            await prisma.pack.updateMany({
                where: { id: packId },
                data: { isSyncedWithJumia: false }
            })
            return { success: true, message: "Pack désactivé sur Jumia avec succès." }
        } else {
            return { success: false, message: "Erreur lors de la désactivation sur Jumia." }
        }
    } catch (e: any) {
        console.error("Erreur deactivatePackOnJumia:", e)
        return { success: false, message: e.message }
    }
}

/**
 * Vérifie si un pack possède une composition identique (livres ou accessoires)
 * à un pack déjà présent ou synchronisé sur Jumia pour éviter les rejets SEO Duplicate.
 */
export async function checkPackJumiaCompositionDuplicate(
    packId?: string,
    bookIds: string[] = [],
    extraProductIds: string[] = []
): Promise<{ isDuplicate: boolean; duplicatePackName?: string }> {
    try {
        if (!bookIds || bookIds.length === 0) return { isDuplicate: false };

        const targetBookIdSig = [...bookIds].sort().join('|') + '#' + [...extraProductIds].sort().join('|');

        const targetBooks = await prisma.book.findMany({
            where: { id: { in: bookIds } },
            select: { title: true }
        });
        const targetTitleSig = targetBooks
            .map(b => b.title.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''))
            .filter(Boolean)
            .sort()
            .join('|');

        const syncedPacks = await prisma.pack.findMany({
            where: {
                ...(packId ? { id: { not: packId } } : {}),
                OR: [
                    { isSyncedWithJumia: true },
                    { jumiaProductSid: { not: null } }
                ]
            },
            include: {
                books: { include: { book: { select: { title: true } } } },
                extraProducts: { select: { extraProductId: true } }
            }
        });

        for (const sp of syncedPacks) {
            const spIdSig = sp.books.map(b => b.bookId).sort().join('|') + '#' + (sp.extraProducts || []).map(e => e.extraProductId).sort().join('|');
            const spTitleSig = sp.books
                .map(b => (b.book?.title || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''))
                .filter(Boolean)
                .sort()
                .join('|');

            if (spIdSig === targetBookIdSig || (targetTitleSig && spTitleSig && spTitleSig === targetTitleSig)) {
                return { isDuplicate: true, duplicatePackName: sp.name };
            }
        }

        return { isDuplicate: false };
    } catch {
        return { isDuplicate: false };
    }
}
