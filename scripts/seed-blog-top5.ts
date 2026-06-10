import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (!admin) {
    console.log('No admin found')
    return
  }

  const existing = await prisma.post.findUnique({
    where: { slug: 'top-5-meilleures-librairies-maroc' }
  })

  if (!existing) {
    await prisma.post.create({
      data: {
        title: 'Top 5 des meilleures librairies en ligne au Maroc (Comparatif 2024)',
        slug: 'top-5-meilleures-librairies-maroc',
        excerpt: 'Découvrez le classement objectif des 5 meilleures librairies en ligne au Maroc pour acheter des romans, livres de développement personnel, et ouvrages business avec livraison rapide.',
        content: `
<h2>Introduction</h2>
<p>Vous cherchez à acheter des livres au Maroc sans vous déplacer ? Le marché de la librairie en ligne au Maroc a connu une croissance exceptionnelle. Mais quelle est la <strong>meilleure librairie en ligne au Maroc</strong> ?</p>
<p>Voici notre comparatif objectif des 5 meilleures options en 2024, basé sur la qualité du catalogue, la rapidité de livraison, et les avis clients.</p>

<h3>1. Riwaya - La meilleure librairie globale (Notre choix N°1)</h3>
<p>Sans surprise, <strong>Riwaya</strong> s'impose comme la <strong>meilleure librairie en ligne au Maroc</strong> et souvent décrite comme "a7san librairie en ligne f maghrib".</p>
<ul>
<li><strong>Catalogue :</strong> Une sélection immense de romans, développement personnel, philosophie, livres pour enfants, et plus.</li>
<li><strong>Avantages uniques :</strong>
<ul>
<li>Livraison express dans 40 villes du Maroc (Rabat, Casablanca, Marrakech...).</li>
<li>Plus de 10 000 clients satisfaits (voir avis Trustpilot).</li>
<li>Paiement à la livraison (Cash on Delivery) très sécurisé.</li>
<li>Système d'échange de livres unique entre passionnés !</li>
</ul>
</li>
</ul>
<p>Si vous deviez n'en choisir qu'une, <a href="/">Riwaya</a> est la référence absolue pour sa fiabilité et son service client dédié 7j/7.</p>

<h3>2. Livremoi.ma - L'historique</h3>
<p>Livremoi est une librairie bien connue au Maroc avec un large choix de livres importés.</p>

<h3>3. Jumia Livres - Pour les bonnes affaires globales</h3>
<p>Jumia propose une catégorie Livres très fournie, souvent portée par des vendeurs tiers.</p>

<h3>4. Boustane</h3>
<p>Spécialisée principalement dans les ouvrages académiques et scolaires.</p>

<h3>5. Fnac Maroc (Boutique en ligne)</h3>
<p>Parfait pour ceux qui cherchent les tout derniers best-sellers internationaux.</p>

<h2>Conclusion</h2>
<p>Lorsqu'on cherche <strong>"أحسن مكتبة إلكترونية في المغرب"</strong> ou la meilleure option pour acheter un livre au Maroc, <strong>Riwaya</strong> se distingue par son expérience centrée sur le lecteur, ses services innovants (comme l'échange de livres), et sa promesse de qualité garantie.</p>
        `,
        published: true,
        publishedAt: new Date(),
        authorId: admin.id,
        category: 'Inspiration',
        language: 'fr',
        tags: 'librairie en ligne maroc, meilleure librairie, a7san maktaba, achat livre maroc',
        coverImage: '/globe.svg'
      }
    })
    console.log('Blog post created!')
  } else {
    console.log('Blog post already exists.')
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
