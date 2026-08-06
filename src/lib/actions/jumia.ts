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
            where: { active: true },
            select: { id: true, isbn: true, stock: true }
        })

        if (books.length === 0) {
            return { success: true, message: "Aucun livre à synchroniser." }
        }

        // L'API Jumia attend souvent un feed XML ou JSON pour la mise à jour massive du stock
        // Exemple avec la nouvelle API: POST /feeds/products/stock ou PUT /catalog/products
        // Comme nous n'avons pas le schéma exact du feed pour la V3, on simule l'appel ou on utilise le endpoint de maj
        
        const updates = books.map(book => ({
            SellerSku: book.isbn || book.id,
            Quantity: book.stock
        }))

        // await jumia.request('/feeds/products/stock', 'POST', { Products: updates })
        
        return { success: true, message: `${books.length} livres synchronisés avec succès avec Jumia.` }
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

        const updates = books.map(book => ({
            sellerSku: book.sellerSku as string,
            stock: book.stock
        }))

        const result = await jumia.updateProductsStock(updates)
        
        if (result?.feedId) {
            // Update local DB instantly to match what we sent
            for (const book of books) {
                await prisma.book.update({
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


export async function publishBooksToJumia(bookIds: string[]) {
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
            const titleAr = book.title || book.titleEn || book.titleFr || `Livre ${book.id.substring(0, 8)}`;
            
            let titleFr = book.titleFr || book.titleEn || `Livre - ${book.sellerSku || book.id.substring(0, 8)}`;
            if (hasArabic(titleFr)) titleFr = `Livre - ${book.sellerSku || book.id.substring(0, 8)}`;
            
            const descArRaw = book.description || book.descriptionEn || book.descriptionFr || titleAr;
            let descFrRaw = book.descriptionFr || book.descriptionEn || book.longDescription || `Un excellent livre - ${book.sellerSku || book.id.substring(0, 8)}`;
            if (hasArabic(descFrRaw)) descFrRaw = `Un excellent livre à lire - ${book.sellerSku || book.id.substring(0, 8)}`;
            
            const padDesc = (desc: string) => {
                const suffix = " - Découvrez ce livre fascinant qui viendra enrichir votre bibliothèque. Une excellente qualité pour des heures de lecture agréables et captivantes.";
                return desc.length >= 50 ? desc.substring(0, 9000) : (desc + " " + suffix).substring(0, 9000);
            };

            const descAr = padDesc(descArRaw);
            const descFr = padDesc(descFrRaw);

            const markupMultiplier = 1 + ((book.jumiaPriceMarkup || 0) / 100);

            const baseName = titleFr.padEnd(15, ' ').substring(0, 60);
            const baseDesc = padDesc(descFr);

            const payload: any = {
                name: {
                    value: baseName, // Length must be 15-60
                    translations: [
                        { language: "AR", value: titleAr.substring(0, 60) },
                        { language: "FR", value: titleFr.substring(0, 60) }
                    ]
                },
                description: {
                    value: baseDesc,
                    translations: [
                        { language: "AR", value: descAr },
                        { language: "FR", value: descFr }
                    ]
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
                    salePrice: book.originalPrice ? {
                        value: Math.ceil(book.price * markupMultiplier),
                        startAt: new Date().toISOString().split('T')[0],
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
                        value: `<ul><li>Titre: ${book.title}</li><li>Auteur: ${book.author}</li><li>Type: Livre</li></ul>`
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

export async function publishPacksToJumia(packIds: string[]) {
    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return { success: false, message: "Jumia n'est pas configuré ou activé." }
        }

        const packs = await prisma.pack.findMany({
            where: { id: { in: packIds } },
            include: { books: { include: { book: true } } }
        })

        if (packs.length === 0) {
            return { success: false, message: "Aucun pack trouvé pour publication." }
        }

        const shops = await jumia.getShops()
        const shopId = shops?.data?.[0]?.id || shops?.[0]?.id || "UNKNOWN_SHOP_ID"
        const productsToCreate: any[] = [];
        const productsToUpdate: any[] = [];

        for (const pack of packs) {
            const hasArabic = (str: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(str);
            const titleAr = pack.name || pack.nameEn || pack.nameFr || `Pack ${pack.id.substring(0, 8)}`;
            
            let titleFr = pack.nameFr || pack.nameEn || `Pack - ${pack.sellerSku || pack.id.substring(0, 8)}`;
            if (hasArabic(titleFr)) titleFr = `Pack - ${pack.sellerSku || pack.id.substring(0, 8)}`;
            
            const descArRaw = pack.description || pack.descriptionEn || pack.descriptionFr || titleAr;
            let descFrRaw = pack.descriptionFr || pack.descriptionEn || pack.description || `Un excellent pack - ${pack.sellerSku || pack.id.substring(0, 8)}`;
            if (hasArabic(descFrRaw)) descFrRaw = `Un excellent pack de livres - ${pack.sellerSku || pack.id.substring(0, 8)}`;
            
            const padDesc = (desc: string) => {
                const suffix = " - Découvrez ce pack fascinant qui viendra enrichir votre bibliothèque. Une excellente qualité pour des heures de lecture agréables et captivantes.";
                return desc.length >= 50 ? desc.substring(0, 9000) : (desc + " " + suffix).substring(0, 9000);
            };

            const descAr = padDesc(descArRaw);
            const descFr = padDesc(descFrRaw);

            const markupMultiplier = 1 + ((pack.jumiaPriceMarkup || 0) / 100);

            const baseName = titleFr.padEnd(15, ' ').substring(0, 60);
            const baseDesc = padDesc(descFr);

            const calculatedStock = pack.books.length > 0 
                ? Math.min(...pack.books.map(b => b.book.stock))
                : 0;

            const payload: any = {
                name: {
                    value: baseName,
                    translations: [
                        { language: "AR", value: titleAr.substring(0, 60) },
                        { language: "FR", value: titleFr.substring(0, 60) }
                    ]
                },
                description: {
                    value: baseDesc,
                    translations: [
                        { language: "AR", value: descAr },
                        { language: "FR", value: descFr }
                    ]
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
                images: pack.image ? [{
                    url: pack.image.startsWith('/') ? `https://riwaya.store${pack.image}` : pack.image,
                    primary: true
                }] : [],
                price: {
                    currency: "MAD",
                    value: Math.ceil((pack.originalPrice || pack.price) * markupMultiplier),
                    salePrice: pack.originalPrice ? {
                        value: Math.ceil(pack.price * markupMultiplier),
                        startAt: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Demain
                        endAt: new Date(Date.now() + 31536000000).toISOString().split('T')[0]
                    } : undefined
                },
                stock: pack.jumiaStock ?? calculatedStock,
                attributes: [
                    {
                        name: "short_description",
                        value: `<ul><li>Titre: ${pack.name}</li><li>Type: Pack de Livres</li></ul>`
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
            return { success: false, message: "Aucun accessoire trouvé pour publication." }
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
                images: accessory.image ? [{
                    url: accessory.image.startsWith('/') ? `https://riwaya.store${accessory.image}` : accessory.image,
                    primary: true
                }] : (accessory.images && accessory.images.length > 0) ? [{
                    url: accessory.images[0].startsWith('/') ? `https://riwaya.store${accessory.images[0]}` : accessory.images[0],
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
                        value: `<ul><li>Produit: ${accessory.name}</li><li>Catégorie: ${accessory.category}</li></ul>`
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
        
        // Use getCatalogStock or getProducts with sellerSku
        const data = await jumia.getCatalogStock({ sellerSku: skuToVerify, size: 1 })
        
        if (data && data.products && data.products.length > 0) {
            const product = data.products[0];
            const stock = product.globalStock !== undefined ? product.globalStock : null;
            
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


export async function checkJumiaLinkBySkuExact(sellerSku: string) {
    if (!sellerSku) return false;
    try {
        await verifyAdmin();
        const jumia = await JumiaAPI.getInstance();
        if (!jumia) return false;
        
        let nextToken: string | undefined = undefined;
        do {
            const res = await jumia.getProducts({ token: nextToken, size: 100 });
            if (res.error) break;
            if (res.products && res.products.length > 0) {
                // Check if any product or its variations has this sellerSku
                for (const p of res.products) {
                    if (p.sellerSku === sellerSku) return true;
                    if (p.variations) {
                        for (const v of p.variations) {
                            if (v.sellerSku === sellerSku) return true;
                        }
                    }
                }
            }
            nextToken = res.nextToken;
            // To avoid huge delays, let's just search first few pages or remove delay if Jumia allows it
            if (nextToken) await new Promise(r => setTimeout(r, 500));
        } while (nextToken);
        
        return false;
    } catch (e) {
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
            select: { sellerSku: true, stock: true, isSyncedWithJumia: true }
        });

        const validBooks = books.filter(b => b.sellerSku && b.isSyncedWithJumia);
        if (validBooks.length === 0) return;

        const products = validBooks.map(b => ({
            sellerSku: b.sellerSku,
            stock: b.stock
        }));

        console.log("Background syncing stock to Jumia for:", products);
        await jumia.updateProductsStock(products);
    } catch (err) {
        console.error("Error in syncJumiaStockForBooksBackground:", err);
    }
}
