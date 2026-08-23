const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    let admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (!admin) {
        admin = await prisma.user.findFirst();
    }
    
    if (!admin) {
        console.error("Aucun utilisateur trouvé pour être l'auteur.");
        return;
    }

    const post = await prisma.post.create({
        data: {
            title: 'Les 10 Meilleurs Livres de Développement Personnel à lire au Maroc',
            slug: 'meilleurs-livres-developpement-personnel-maroc',
            excerpt: "Découvrez notre sélection des livres incontournables pour changer votre vie. Que vous soyez à Casablanca, Rabat ou Marrakech, voici les pépites à lire absolument cette année.",
            content: `
<h2>Pourquoi le développement personnel est essentiel aujourd'hui ?</h2>
<p>Dans un monde de plus en plus rapide, prendre le temps de lire un livre de développement personnel est un investissement rentable. Au Maroc, l'engouement pour ces lectures ne cesse de croître.</p>

<h2>Notre Top 10</h2>
<ol>
<li><strong>L'Alchimiste</strong> - Paulo Coelho : Un classique indémodable sur la légende personnelle.</li>
<li><strong>Atomic Habits (Un Rien Peut Tout Changer)</strong> - James Clear : La méthode pour construire de bonnes habitudes.</li>
<li><strong>Père Riche, Père Pauvre</strong> - Robert Kiyosaki : L'éducation financière indispensable.</li>
<li><strong>Le Pouvoir de l'Intention</strong> - Wayne Dyer</li>
<li><strong>Les 4 Accords Toltèques</strong> - Don Miguel Ruiz</li>
</ol>

<p>Découvrez tous ces livres sur <strong>Riwaya</strong> avec livraison partout au Maroc (Paiement à la livraison).</p>
            `,
            coverImage: '/marketing/audio-hero.jpg', // Placeholder
            authorId: admin.id,
            authorName: admin.name || 'Équipe Riwaya',
            published: true,
            publishedAt: new Date(),
            category: 'Développement Personnel',
            language: 'fr',
            tags: '["maroc", "développement personnel", "livres"]',
            isCompleted: true
        }
    })

    console.log("Article créé avec succès : ", post.title)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
