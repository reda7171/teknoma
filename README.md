# Tekno.ma (Tekno Store)

Plateforme e-commerce High-Tech au Maroc : Smartphones, Ordinateurs portables, Mac, Audio et Accessoires électroniques de pointe avec paiement à la livraison (Cash On Delivery - COD).

## Caractéristiques principales

- **Catalogue High-Tech** : Smartphones (iPhone, Samsung Galaxy), PC & Mac (MacBook Pro/Air M3, Asus ROG, Dell XPS), Casques & Écouteurs (Sony, AirPods), Chargeurs GaN et Accessoires.
- **Paiement à la livraison (COD)** : Commande rapide avec expédition 24/48h dans toutes les villes du Maroc (Casablanca, Rabat, Marrakech, Tanger, Fès, Agadir...).
- **Multi-devises & Multi-langues** : Interface disponible en Français, Arabe (RTL complet) et Anglais.
- **Back-office Admin & POS** : Gestion complète des commandes, stocks unitaire par IMEI / numéro de série, packs promotionnels et expéditions.
- **Recherche globale IMEI / S/N** : Scanner ou coller un code-barres / IMEI pour retrouver instantanément la fiche produit, le statut de garantie 12 mois et la commande client.
- **Bouton WhatsApp contextuel** : Message d'accueil pré-rempli et dynamique selon le modèle de produit consulté, le panier ou la page de destination.
- **Stack technique** : Next.js 16 (App Router & Turbopack), React 19, TypeScript, Tailwind CSS, Prisma ORM, MySQL.

## Démarrage rapide

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Configurer les variables d'environnement dans `.env` :
   ```env
   DATABASE_URL="mysql://teknoma_user:TeknoPass2026_Secure!@167.86.108.246:3908/teknoma_db"
   NEXT_PUBLIC_SITE_URL="https://tekno.ma"
   NEXT_PUBLIC_CONTACT_EMAIL="Contact.tekno.ma@gmail.com"
   ```

3. Générer le client Prisma :
   ```bash
   npx prisma generate
   ```

4. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```
