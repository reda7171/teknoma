import dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

async function testN8nBatch() {
    // Par défaut on utilise l'URL de production si N8N_WEBHOOK_URL est défini
    // Mais pour les tests visuels, on force le mode "-test" si l'URL ne l'a pas
    let webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://167.86.108.246:5678/webhook/riwaya-publish'
    
    // Remplace "/webhook/" par "/webhook-test/" pour voir l'exécution en direct dans n8n
    webhookUrl = webhookUrl.replace('/webhook/', '/webhook-test/')

    console.log('🚀 Envoi du lot vers :', webhookUrl)
    console.log('---')

    const payload = {
        batch: [
            {
                platform: "facebook",
                caption: "🚀 Post 1 du lot: Voici notre premier test par lot via n8n !",
                scheduleAt: "", // Vide pour publication immédiate
                // Variables optionnelles simulées
                image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800",
                bookId: "test-book-1"
            },
            {
                platform: "instagram",
                caption: "📸 Post 2 du lot: Voici une publication simulée pour Instagram.",
                scheduleAt: "",
                image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800",
                bookId: "test-book-2"
            },
            {
                platform: "facebook",
                caption: "⏰ Post 3 du lot: Ce post simulé serait normalement programmé !",
                // Exemple d'une date programmée : ajoute 2 heures à l'heure actuelle
                scheduleAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                image: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=800",
                bookId: "test-book-3"
            }
        ]
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const data = await response.text()
        
        if (response.ok) {
            console.log('✅ Succès ! n8n a bien reçu le lot.')
            console.log('Réponse de n8n :', data)
            console.log('\n👉 Allez vérifier l\'interface n8n pour voir l\'exécution du workflow !')
        } else {
            console.log('❌ Erreur HTTP :', response.status, response.statusText)
            console.log('Détails :', data)
            console.log("\nAssurez-vous d'avoir cliqué sur 'Listen for test event' dans n8n avant de lancer ce script.")
        }
    } catch (error) {
        console.error('❌ Erreur de connexion au serveur n8n :', error)
    }
}

testN8nBatch()
