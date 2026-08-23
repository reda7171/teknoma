import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
    console.log("🚀 Lancement du bot Facebook Marketplace...");

    // 1. Récupération du livre sélectionné
    const bookId = process.env.BOOK_ID;
    
    if (!bookId) {
        console.log("❌ Aucun ID de livre fourni.");
        await prisma.$disconnect();
        return;
    }

    const book = await prisma.book.findUnique({
        where: { id: bookId }
    });

    if (!book) {
        console.log("❌ Aucun livre en stock trouvé.");
        await prisma.$disconnect();
        return;
    }
    
    console.log(`📚 Livre à publier : ${book.title} (${book.price} MAD)`);

    // 2. Lancement du navigateur
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: "./scripts/fb_session_data",
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    const typeDelay = { delay: 50 }; // Écriture naturelle

    try {
        await page.goto('https://web.facebook.com/marketplace/create/item', { waitUntil: 'networkidle2' });
        console.log("✅ Interface Marketplace chargée.");

        const typeDelay = { delay: 30 };
        
        // Fonction robuste pour tester plusieurs langues (FR/EN)
        const fillField = async (ariaLabels: string[], value: string) => {
            let found = false;
            // Méthode 1: Trouver l'élément qui a l'aria-label et vérifier s'il active un champ de texte
            for (const label of ariaLabels) {
                try {
                    const elements = await page.$$(`[aria-label="${label}"]`);
                    for (const el of elements) {
                        try {
                            const tagName = await page.evaluate(e => e.tagName.toLowerCase(), el);
                            // On tente de cliquer sur tout élément pertinent (souvent c'est un label ou div combobox)
                            if (['input', 'textarea', 'label', 'div', 'span'].includes(tagName)) {
                                await el.click();
                                await new Promise(r => setTimeout(r, 500));
                                
                                // Vérifie si un champ de texte a bien reçu le focus
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
                                    console.log(`✅ Champ rempli : ${label} (clic sur ${tagName})`);
                                    found = true;
                                    break;
                                }
                            }
                        } catch(e) {}
                    }
                } catch(e) {}
                if (found) break;
            }

            // Méthode 2: Trouver par le texte visible
            if (!found) {
                for (const label of ariaLabels) {
                    try {
                        const inputHandle = await page.evaluateHandle((lblText) => {
                            const els = Array.from(document.querySelectorAll('span, label'));
                            for (const el of els) {
                                const text = el.textContent ? el.textContent.trim() : '';
                                if (text.startsWith(lblText) && text.length <= lblText.length + 30) {
                                    const labelEl = el.closest('label');
                                    // Vérifier que le label n'est pas un conteneur géant
                                    if (labelEl && labelEl.textContent && labelEl.textContent.length < 150) {
                                        const fields = Array.from(labelEl.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]'));
                                        if (fields.length > 0) {
                                            return fields[fields.length - 1];
                                        }
                                    }
                                }
                            }
                            return null;
                        }, label);
                        
                        if (inputHandle && await inputHandle.evaluate(i => i !== null)) {
                            await (inputHandle as any).click();
                            await new Promise(r => setTimeout(r, 500));
                            await page.keyboard.down('Control');
                            await page.keyboard.press('A');
                            await page.keyboard.up('Control');
                            await page.keyboard.press('Backspace');
                            await page.keyboard.type(value, typeDelay);
                            console.log(`✅ Champ rempli : ${label} (via texte du label)`);
                            found = true;
                            break;
                        }
                    } catch(e) {}
                }
            }
            
            if (!found) {
                console.log(`⚠️ Champ "${ariaLabels.join(' / ')}" introuvable.`);
            }
        };

        const selectDropdown = async (ariaLabels: string[], optionsText: string[]) => {
             let foundDropdown = false;
             for (const label of ariaLabels) {
                 try {
                     // Cherche le menu déroulant
                     const handle = await page.evaluateHandle((lbl) => {
                         // 1. Cherche par aria-label
                         const els = document.querySelectorAll(`[aria-label="${lbl}"]`);
                         if (els.length > 0) return els[0];
                         
                         // 2. Cherche par texte visible
                         const spans = Array.from(document.querySelectorAll('span, label'));
                         for (const s of spans) {
                             if (s.textContent === lbl) {
                                 const p = s.closest('label');
                                 if (p) return p;
                                 return s; // Ou retourne le span lui-même
                             }
                         }
                         return null;
                     }, label);

                     if (handle && await handle.evaluate(i => i !== null)) {
                         // Forcer le clic directement dans le navigateur pour contourner les éléments superposés
                         await page.evaluate((el: any) => el.click(), handle);
                         await new Promise(r => setTimeout(r, 2000)); // Attendre 2 secondes que l'animation du menu se termine
                         
                         let clicked = false;
                         for (const text of optionsText) {
                             const success = await page.evaluate((searchText) => {
                                 const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                                 let node;
                                 while (node = walker.nextNode()) {
                                     // Recherche exacte
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
                            await page.keyboard.press('Escape'); // Fermer le menu si échec
                            await new Promise(r => setTimeout(r, 500));
                         } else {
                             foundDropdown = true;
                             break;
                         }
                     }
                 } catch (e) {}
                 
                 if (foundDropdown) break;
             }
             if (!foundDropdown) console.log(`⚠️ Menu "${ariaLabels.join(' / ')}" introuvable ou aucune option trouvée.`);
        }

        await new Promise(r => setTimeout(r, 3000)); // Laisser FB finir de charger le JS (très lourd)

        await fillField(["Titre", "Title"], book.title);
        await fillField(["Prix", "Price"], book.price.toString());

        // --- SÉLECTION DE LA CATÉGORIE ---
        console.log("Tentative de sélection de la catégorie...");
        const categoryTexts = ['Livres, films et musique', 'Livres', 'Books', 'Books, Movies & Music', 'Books & movies'];
        await selectDropdown(["Catégorie", "Category"], categoryTexts);

        // --- SÉLECTION DE L'ÉTAT ---
        console.log("Tentative de sélection de l'état...");
        const stateTexts = ['Neuf', 'New'];
        await selectDropdown(["État", "Condition"], stateTexts);

        // --- SCROLL POUR DÉVOILER LE RESTE ---
        console.log("Scroll pour afficher les champs masqués...");
        await page.mouse.wheel({ deltaY: 800 });
        await new Promise(r => setTimeout(r, 1500));

        if (book.description) {
            const cleanDesc = book.description.replace(/<[^>]*>?/gm, '').substring(0, 1500);
            await fillField(["Description", "Description (optional)", "Description (facultatif)", "Description (optionnel)"], cleanDesc);
        }

        // --- AVAILABILITY ---
        console.log("Tentative de sélection de la disponibilité...");
        const availabilityTexts = ['Mettre en vente comme article unique', 'List as Single Item'];
        await selectDropdown(["Disponibilité", "Availability", "Availability (optional)"], availabilityTexts);

        // --- PRODUCT TAGS ---
        console.log("Tentative de remplissage des tags...");
        const tags = `livre, book, roman`;
        try {
            const tagSelectors = [
                'textarea[aria-label="Tags"]',
                'textarea[aria-label="Product tags"]',
                'textarea[aria-label="Étiquettes de produit"]',
                'input[aria-label="Tags"]',
                'input[aria-label="Product tags"]',
                'input[aria-label="Étiquettes de produit"]',
                'label[aria-label="Tags"]',
                'label[aria-label="Product tags"]',
                'label[aria-label="Étiquettes de produit"]'
            ];
            
            let tagHandle = null;
            for (const sel of tagSelectors) {
                tagHandle = await page.$(sel);
                if (tagHandle) break;
            }
            
            if (tagHandle) {
                // Focus explicite pour s'assurer qu'on quitte le champ Description
                await (tagHandle as any).focus();
                await (tagHandle as any).click();
                await new Promise(r => setTimeout(r, 500));
                
                await page.keyboard.type(tags, { delay: 50 });
                await page.keyboard.press('Enter');
                console.log("✅ Tags remplis avec succès.");
            } else {
                console.log("⚠️ Champ Tags introuvable via les sélecteurs stricts.");
                // Si les sélecteurs stricts échouent, on essaie de cliquer pour retirer le focus de la description
                await page.mouse.click(0, 0); 
            }
        } catch (e) {
            console.log("⚠️ Erreur lors du remplissage des tags:", e);
        }


        // --- UPLOAD IMAGE ---
        try {
            console.log("Tentative d'upload de l'image...");
            if (book.image) {
                const imagePath = require('path').join(process.cwd(), 'public', book.image);
                const fs = require('fs');
                
                // Si l'image n'existe pas localement, on la télécharge depuis la prod
                if (!fs.existsSync(imagePath)) {
                    console.log(`L'image n'existe pas localement. Téléchargement depuis riwaya.store...`);
                    const prodUrl = `https://riwaya.store${book.image}`;
                    try {
                        const response = await fetch(prodUrl);
                        if (response.ok) {
                            const buffer = await response.arrayBuffer();
                            // S'assurer que le dossier existe
                            const dir = require('path').dirname(imagePath);
                            if (!fs.existsSync(dir)) {
                                fs.mkdirSync(dir, { recursive: true });
                            }
                            fs.writeFileSync(imagePath, Buffer.from(buffer));
                            console.log(`✅ Image téléchargée depuis la prod avec succès.`);
                        } else {
                            console.log(`⚠️ Impossible de télécharger l'image depuis la prod (${response.status}).`);
                        }
                    } catch (err) {
                        console.log(`⚠️ Erreur réseau lors du téléchargement depuis la prod:`, err);
                    }
                }

                if (fs.existsSync(imagePath)) {
                    // Cherche tous les inputs de type file et upload sur chacun d'eux
                    const fileInputs = await page.$$('input[type="file"]');
                    let uploaded = false;
                    for (const input of fileInputs) {
                        try {
                            await input.uploadFile(imagePath);
                            uploaded = true;
                        } catch (e) {}
                    }
                    
                    if (uploaded) {
                        console.log(`✅ Image uploadée sur Facebook : ${imagePath}`);
                        await new Promise(r => setTimeout(r, 3000)); // Laisser le temps à Facebook de charger l'image
                    } else {
                        console.log("⚠️ Champ d'upload d'image introuvable (aucun input[type='file'] valide).");
                    }
                } else {
                    console.log(`⚠️ Fichier image introuvable sur le disque (et échec du téléchargement) : ${imagePath}`);
                }
            } else {
                console.log("⚠️ Le livre n'a pas d'image définie.");
            }
        } catch(e) {
             console.log("⚠️ Erreur lors de l'upload de l'image.", e);
        }

        console.log("✅ Remplissage terminé. Vérifiez l'interface.");
        console.log("⚠️ Cliquez manuellement sur Publier si tout est correct.");

    } catch (e) {
        console.error("❌ Erreur pendant le remplissage (l'interface FB a peut-être changé) :", e);
    }

    await prisma.$disconnect();
    // Le navigateur reste ouvert exprès
})();
