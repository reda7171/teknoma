import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

(async () => {
    console.log("🚀 Lancement du bot Facebook Marketplace...");

    // 1. Récupération des livres sélectionnés (batch ou unique)
    const rawIds = process.env.BOOK_IDS
        ? process.env.BOOK_IDS.split(',').map(s => s.trim()).filter(Boolean)
        : (process.env.BOOK_ID ? [process.env.BOOK_ID.trim()] : []);

    if (rawIds.length === 0) {
        console.log("❌ Aucun ID de livre fourni.");
        await prisma.$disconnect();
        return;
    }

    const books = await prisma.book.findMany({
        where: { id: { in: rawIds } }
    });

    if (books.length === 0) {
        console.log("❌ Aucun livre trouvé pour les identifiants fournis.");
        await prisma.$disconnect();
        return;
    }

    console.log(`📚 ${books.length} livre(s) sélectionné(s) pour publication par lot.`);

    const useWatermark = process.env.USE_WATERMARK === 'true';

    // 2. Lancement du navigateur
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: "./scripts/fb_session_data",
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const typeDelay = { delay: 30 };

    for (let bookIndex = 0; bookIndex < books.length; bookIndex++) {
        const book = books[bookIndex];
        console.log(`\n========================================`);
        console.log(`▶ [${bookIndex + 1}/${books.length}] Préparation de : "${book.title}" (${book.price} MAD)`);
        console.log(`========================================`);

        // Pour le premier livre on utilise le premier onglet, sinon on en ouvre un nouveau
        const page = bookIndex === 0 ? (await browser.pages())[0] || await browser.newPage() : await browser.newPage();

        try {
            await page.goto('https://web.facebook.com/marketplace/create/item', { waitUntil: 'networkidle2' });
            console.log("✅ Interface Marketplace chargée.");

            // Helper de remplissage
            const fillField = async (ariaLabels: string[], value: string) => {
                let found = false;
                for (const label of ariaLabels) {
                    try {
                        const elements = await page.$$(`[aria-label="${label}"]`);
                        for (const el of elements) {
                            try {
                                const tagName = await page.evaluate(e => e.tagName.toLowerCase(), el);
                                if (['input', 'textarea', 'label', 'div', 'span'].includes(tagName)) {
                                    await el.click();
                                    await new Promise(r => setTimeout(r, 400));

                                    const isFocused = await page.evaluate(() => {
                                        const active = document.activeElement;
                                        return active && (
                                            active.tagName === 'INPUT' ||
                                            active.tagName === 'TEXTAREA' ||
                                            active.getAttribute('contenteditable') === 'true' ||
                                            active.getAttribute('role') === 'textbox'
                                        );
                                    });

                                    if (isFocused) {
                                        await page.keyboard.down('Control');
                                        await page.keyboard.press('A');
                                        await page.keyboard.up('Control');
                                        await page.keyboard.press('Backspace');
                                        await page.keyboard.type(value, typeDelay);
                                        console.log(`✅ Champ rempli : ${label}`);
                                        found = true;
                                        break;
                                    }
                                }
                            } catch {}
                        }
                    } catch {}
                    if (found) break;
                }

                if (!found) {
                    for (const label of ariaLabels) {
                        try {
                            const inputHandle = await page.evaluateHandle((lblText) => {
                                const els = Array.from(document.querySelectorAll('span, label'));
                                for (const el of els) {
                                    const text = el.textContent ? el.textContent.trim() : '';
                                    if (text.startsWith(lblText) && text.length <= lblText.length + 30) {
                                        const labelEl = el.closest('label');
                                        if (labelEl && labelEl.textContent && labelEl.textContent.length < 150) {
                                            const fields = Array.from(labelEl.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]'));
                                            if (fields.length > 0) return fields[fields.length - 1];
                                        }
                                    }
                                }
                                return null;
                            }, label);

                            if (inputHandle && await inputHandle.evaluate(i => i !== null)) {
                                await (inputHandle as any).click();
                                await new Promise(r => setTimeout(r, 400));
                                await page.keyboard.down('Control');
                                await page.keyboard.press('A');
                                await page.keyboard.up('Control');
                                await page.keyboard.press('Backspace');
                                await page.keyboard.type(value, typeDelay);
                                console.log(`✅ Champ rempli : ${label} (label visible)`);
                                found = true;
                                break;
                            }
                        } catch {}
                    }
                }

                if (!found) console.log(`⚠️ Champ "${ariaLabels.join(' / ')}" introuvable.`);
            };

            const selectDropdown = async (ariaLabels: string[], optionsText: string[]) => {
                let foundDropdown = false;
                for (const label of ariaLabels) {
                    try {
                        const handle = await page.evaluateHandle((lbl) => {
                            const els = document.querySelectorAll(`[aria-label="${lbl}"]`);
                            if (els.length > 0) return els[0];
                            const spans = Array.from(document.querySelectorAll('span, label'));
                            for (const s of spans) {
                                if (s.textContent === lbl) {
                                    const p = s.closest('label');
                                    return p || s;
                                }
                            }
                            return null;
                        }, label);

                        if (handle && await handle.evaluate(i => i !== null)) {
                            await page.evaluate((el: any) => el.click(), handle);
                            await new Promise(r => setTimeout(r, 1500));

                            let clicked = false;
                            for (const text of optionsText) {
                                const success = await page.evaluate((searchText) => {
                                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                                    let node;
                                    while (node = walker.nextNode()) {
                                        if (node.nodeValue && node.nodeValue.trim() === searchText) {
                                            const parent = node.parentElement;
                                            if (parent) {
                                                const clickable = parent.closest('[role="option"], [role="menuitem"]') || parent;
                                                (clickable as HTMLElement).click();
                                                return true;
                                            }
                                        }
                                    }
                                    return false;
                                }, text);

                                if (success) {
                                    clicked = true;
                                    console.log(`✅ Option sélectionnée : ${text}`);
                                    break;
                                }
                            }

                            if (!clicked) {
                                await page.keyboard.press('Escape');
                                await new Promise(r => setTimeout(r, 400));
                            } else {
                                foundDropdown = true;
                                break;
                            }
                        }
                    } catch {}
                    if (foundDropdown) break;
                }
                if (!foundDropdown) console.log(`⚠️ Menu "${ariaLabels.join(' / ')}" non trouvé.`);
            };

            await new Promise(r => setTimeout(r, 2500));

            await fillField(["Titre", "Title"], book.title);
            await fillField(["Prix", "Price"], book.price.toString());

            // Catégorie
            console.log("Sélection catégorie...");
            await selectDropdown(["Catégorie", "Category"], ['Livres, films et musique', 'Livres', 'Books', 'Books, Movies & Music']);

            // État
            console.log("Sélection état...");
            await selectDropdown(["État", "Condition"], ['Neuf', 'New']);

            // Scroll pour description
            await page.mouse.wheel({ deltaY: 800 });
            await new Promise(r => setTimeout(r, 1200));

            if (book.description) {
                const cleanDesc = book.description.replace(/<[^>]*>?/gm, '').substring(0, 1500);
                await fillField(["Description", "Description (optional)", "Description (facultatif)", "Description (optionnel)"], cleanDesc);
            }

            // Disponibilité
            await selectDropdown(["Disponibilité", "Availability", "Availability (optional)"], ['Mettre en vente comme article unique', 'List as Single Item']);

            // Tags
            try {
                const tagHandle = await page.$('input[aria-label="Tags"], textarea[aria-label="Tags"], input[aria-label="Product tags"], input[aria-label="Étiquettes de produit"]');
                if (tagHandle) {
                    await (tagHandle as any).click();
                    await page.keyboard.type(`livre, book, roman, ${book.category || 'lecture'}`, { delay: 40 });
                    await page.keyboard.press('Enter');
                    console.log("✅ Tags saisis.");
                }
            } catch {}

            // UPLOAD IMAGE (avec filigrane si demandé)
            try {
                console.log("Upload de l'image de couverture...");
                let finalImagePath = '';

                if (useWatermark) {
                    const watermarkedFile = path.join(process.cwd(), 'public', 'uploads', 'facebook-bot', `watermarked_${book.id}.jpg`);
                    if (fs.existsSync(watermarkedFile)) {
                        finalImagePath = watermarkedFile;
                        console.log(`✨ Utilisation de l'image avec filigrane : ${watermarkedFile}`);
                    }
                }

                if (!finalImagePath && book.image) {
                    finalImagePath = path.join(process.cwd(), 'public', book.image.replace(/^\/+/, ''));
                    // Télécharger si manquant
                    if (!fs.existsSync(finalImagePath)) {
                        const prodUrl = `https://tekno.ma${book.image.startsWith('/') ? book.image : '/' + book.image}`;
                        try {
                            const res = await fetch(prodUrl);
                            if (res.ok) {
                                const buffer = await res.arrayBuffer();
                                fs.mkdirSync(path.dirname(finalImagePath), { recursive: true });
                                fs.writeFileSync(finalImagePath, Buffer.from(buffer));
                            }
                        } catch {}
                    }
                }

                if (finalImagePath && fs.existsSync(finalImagePath)) {
                    const fileInputs = await page.$$('input[type="file"]');
                    let uploaded = false;
                    for (const input of fileInputs) {
                        try {
                            await input.uploadFile(finalImagePath);
                            uploaded = true;
                        } catch {}
                    }
                    if (uploaded) {
                        console.log(`✅ Image téléversée avec succès sur Facebook.`);
                        await new Promise(r => setTimeout(r, 3000));
                    }
                } else {
                    console.log(`⚠️ Aucune image valide trouvée sur le disque pour ce livre.`);
                }
            } catch (err) {
                console.error("⚠️ Erreur lors de l'upload d'image :", err);
            }

            console.log(`✅ [${bookIndex + 1}/${books.length}] "${book.title}" prêt sur l'onglet.`);
            if (bookIndex < books.length - 1) {
                console.log("⏳ Pause de 3 secondes avant d'ouvrir le prochain livre du lot...");
                await new Promise(r => setTimeout(r, 3000));
            }

        } catch (err) {
            console.error(`❌ Erreur sur "${book.title}":`, err);
        }
    }

    console.log(`\n🎉 Lot de ${books.length} livre(s) préparé avec succès sur Facebook Marketplace !`);
    console.log(`⚠️ Vérifiez chaque onglet et cliquez sur "Publier" quand vous êtes prêt.`);

    await prisma.$disconnect();
})();
