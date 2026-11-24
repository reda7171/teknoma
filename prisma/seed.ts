import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Initialisation du seed Tekno Store ---')

  // 1. Admin Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  
  await prisma.user.upsert({
    where: { email: 'admin@riwaya.com' },
    update: { role: 'ADMIN', fullName: 'Administrateur Tekno Store' },
    create: {
      email: 'admin@riwaya.com',
      password: adminPasswordHash,
      role: 'ADMIN',
      fullName: 'Administrateur Tekno Store',
      phone: '+212600000000',
      city: 'Casablanca',
    },
  })

  await prisma.user.upsert({
    where: { email: 'Contact.tekno.ma@gmail.com' },
    update: { role: 'ADMIN', fullName: 'Direction Tekno Store' },
    create: {
      email: 'Contact.tekno.ma@gmail.com',
      password: adminPasswordHash,
      role: 'ADMIN',
      fullName: 'Direction Tekno Store',
      phone: '+212600000000',
      city: 'Casablanca',
    },
  })

  // 2. Catégories Officielles Tekno.ma
  const techCategories = [
    'Smartphones',
    'PC Portables',
    'Mac & Apple',
    'Accessoires',
    'Audio',
    'Stockage',
  ]

  for (const name of techCategories) {
    await prisma.categoryConfig.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  // 3. Paramètres du site (SiteSettings)
  const settings = [
    { key: 'site_name', value: 'Tekno Store', category: 'general', description: 'Nom de la boutique' },
    { key: 'site_domain', value: 'tekno.ma', category: 'general', description: 'Domaine officiel' },
    { key: 'contact_email', value: 'Contact.tekno.ma@gmail.com', category: 'contact', description: 'Email de support' },
    { key: 'contact_phone', value: '+212600000000', category: 'contact', description: 'WhatsApp / Téléphone' },
    { key: 'google_maps_url', value: 'https://maps.app.goo.gl/5aNUmiY8yMsR2kwa6?g_st=iw', category: 'contact', description: 'Localisation Google Maps' },
    { key: 'currency', value: 'MAD', category: 'general', description: 'Devise par défaut' },
    { key: 'delivery_badge', value: 'Livraison 24/48h partout au Maroc - Paiement à la livraison (COD)', category: 'marketing', description: 'Bandeau livraison' },
  ]

  for (const s of settings) {
    await prisma.siteSettings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
  }

  // 4. Entreprises de livraison & Villes
  const shipping = [
    { name: 'WithYou Delivery', supportPhone: '+212600000001', isActive: true },
    { name: 'Amana Express', supportPhone: '+212600000002', isActive: true },
    { name: 'Livraison Express Locale', supportPhone: '+212600000003', isActive: true },
  ]

  for (const sh of shipping) {
    const existing = await prisma.shippingCompany.findFirst({ where: { name: sh.name } })
    if (!existing) {
      await prisma.shippingCompany.create({ data: sh })
    }
  }

  const cities = [
    { city: 'Casablanca', price: 25 },
    { city: 'Rabat', price: 35 },
    { city: 'Marrakech', price: 40 },
    { city: 'Tanger', price: 40 },
    { city: 'Fès', price: 40 },
    { city: 'Agadir', price: 45 },
    { city: 'Oujda', price: 45 },
  ]

  for (const c of cities) {
    await prisma.cityDelivery.upsert({
      where: { city: c.city },
      update: { price: c.price },
      create: { city: c.city, price: c.price, active: true },
    })
  }

  // 5. Produits High-Tech
  const techProducts = [
    // Smartphones
    {
      title: 'iPhone 16 Pro Max 256GB Titane Naturel',
      author: 'Apple',
      category: 'Smartphones',
      subCategory: 'Apple iPhone',
      price: 14990,
      originalPrice: 15990,
      costPrice: 13500,
      stock: 15,
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
      description: 'Le summum de la technologie Apple avec puce A18 Pro, châssis titane ultraléger, contrôle de la caméra et autonomie record.',
      descriptionFr: 'iPhone 16 Pro Max 256GB Titane Naturel avec puce A18 Pro et téléobjectif 5x. Garantie 1 an, neuf sous blister.',
      descriptionEn: 'iPhone 16 Pro Max 256GB Natural Titanium with A18 Pro chip and 5x telephoto camera. 1-year warranty.',
      isBestSeller: true,
      isPromoted: true,
      imageAlt: 'iPhone 16 Pro Max 256GB Titane Naturel Maroc',
    },
    {
      title: 'Samsung Galaxy S24 Ultra 512GB Gris Titane',
      author: 'Samsung',
      category: 'Smartphones',
      subCategory: 'Samsung Galaxy',
      price: 12490,
      originalPrice: 13490,
      costPrice: 11000,
      stock: 12,
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
      description: 'L’expérience ultime Galaxy AI avec processeur Snapdragon 8 Gen 3, capteur photo 200MP et stylet S Pen intégré.',
      descriptionFr: 'Samsung Galaxy S24 Ultra 512GB avec Galaxy AI, écran Dynamic AMOLED 2X 120Hz et stylet S-Pen inclus.',
      descriptionEn: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray with Galaxy AI and built-in S Pen.',
      isBestSeller: true,
      isPromoted: false,
      imageAlt: 'Samsung Galaxy S24 Ultra 512GB Maroc',
    },
    {
      title: 'iPhone 15 128GB Noir Sidéral',
      author: 'Apple',
      category: 'Smartphones',
      subCategory: 'Apple iPhone',
      price: 8990,
      originalPrice: 9690,
      costPrice: 8000,
      stock: 20,
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80',
      description: 'Dynamic Island, capteur principal 48 Mpx et connecteur USB-C réunis dans un design en aluminium et verre teinté.',
      descriptionFr: 'iPhone 15 128GB avec Dynamic Island et port USB-C. Produit officiel garantie 1 an.',
      descriptionEn: 'iPhone 15 128GB Black with Dynamic Island and USB-C port.',
      isBestSeller: false,
      isPromoted: false,
      imageAlt: 'iPhone 15 128GB Noir Maroc',
    },
    {
      title: 'Xiaomi 14 Ultra 512GB Noir Leica',
      author: 'Xiaomi',
      category: 'Smartphones',
      subCategory: 'Xiaomi',
      price: 9990,
      originalPrice: 10990,
      costPrice: 8800,
      stock: 8,
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
      description: 'Photophonie d’exception avec optique Leica quadruple capteur 50MP et processeur Snapdragon 8 Gen 3.',
      descriptionFr: 'Xiaomi 14 Ultra avec optique professionnelle Leica Summilux et charge ultra rapide 90W.',
      descriptionEn: 'Xiaomi 14 Ultra with Leica professional quad camera.',
      isBestSeller: false,
      isPromoted: false,
      imageAlt: 'Xiaomi 14 Ultra Leica Maroc',
    },

    // Mac & Apple
    {
      title: "MacBook Air 13 pouces Puce M3 16GB RAM 512GB SSD Minuit",
      author: 'Apple',
      category: 'Mac & Apple',
      subCategory: 'MacBook Air',
      price: 14490,
      originalPrice: 15490,
      costPrice: 13000,
      stock: 14,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
      description: 'Finesse remarquable, autonomie jusqu’à 18 heures et performances décuplées grâce à la nouvelle puce Apple M3.',
      descriptionFr: 'MacBook Air 13 pouces M3 avec 16GB de mémoire unifiée et 512GB SSD. Clavier français AZERTY ou QWERTY.',
      descriptionEn: 'MacBook Air 13-inch M3 chip with 16GB RAM and 512GB SSD.',
      isBestSeller: true,
      isPromoted: true,
      imageAlt: 'MacBook Air M3 13 pouces Maroc',
    },
    {
      title: "MacBook Pro 14 pouces Puce M3 Pro 18GB RAM 512GB Noir Sidéral",
      author: 'Apple',
      category: 'Mac & Apple',
      subCategory: 'MacBook Pro',
      price: 22990,
      originalPrice: 24490,
      costPrice: 20500,
      stock: 8,
      image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
      description: 'Puissance extrême pour créateurs et professionnels : écran Liquid Retina XDR 120Hz et puce Apple M3 Pro.',
      descriptionFr: 'MacBook Pro 14 M3 Pro pour le montage 4K, le dev et le graphisme intensif. Finition Space Black.',
      descriptionEn: 'MacBook Pro 14-inch M3 Pro chip in Space Black.',
      isBestSeller: true,
      isPromoted: true,
      imageAlt: 'MacBook Pro 14 M3 Pro Maroc',
    },
    {
      title: "iPad Pro 11 pouces M4 OLED 256GB Wi-Fi Argent",
      author: 'Apple',
      category: 'Mac & Apple',
      subCategory: 'iPad',
      price: 11490,
      originalPrice: 12190,
      costPrice: 10200,
      stock: 15,
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80',
      description: 'L’iPad le plus fin jamais conçu avec écran Ultra Retina XDR OLED en tandem et puissance de la puce M4.',
      descriptionFr: 'iPad Pro 11 M4 avec écran OLED révolutionnaire et compatibilité Apple Pencil Pro.',
      descriptionEn: 'iPad Pro 11-inch M4 OLED 256GB Silver.',
      isBestSeller: false,
      isPromoted: false,
      imageAlt: 'iPad Pro M4 OLED Maroc',
    },
    {
      title: 'Apple Watch Series 10 GPS 46mm Noir de Jais',
      author: 'Apple',
      category: 'Mac & Apple',
      subCategory: 'Apple Watch',
      price: 5490,
      originalPrice: 5890,
      costPrice: 4700,
      stock: 18,
      image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
      description: 'Boîtier affiné, écran OLED plus large avec grand angle de vision et charge ultra-rapide.',
      descriptionFr: 'Apple Watch Series 10 46mm aluminium poli noir de jais avec suivi santé avancé.',
      descriptionEn: 'Apple Watch Series 10 GPS 46mm Jet Black.',
      isBestSeller: true,
      isPromoted: false,
      imageAlt: 'Apple Watch Series 10 46mm Maroc',
    },

    // PC Portables
    {
      title: 'ASUS ROG Strix G16 (i9-14900HX / RTX 4070 / 32GB / 1TB)',
      author: 'Asus',
      category: 'PC Portables',
      subCategory: 'PC Gamer',
      price: 18990,
      originalPrice: 20490,
      costPrice: 17000,
      stock: 6,
      image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80',
      description: 'Machine de guerre gaming avec écran Nebula Display 240Hz, Core i9 de 14e génération et GPU NVIDIA GeForce RTX 4070.',
      descriptionFr: 'PC Portable Gamer ASUS ROG Strix G16 conçu pour les jeux compétitifs et le rendu 3D ultra-fluide.',
      descriptionEn: 'ASUS ROG Strix G16 Gaming Laptop with RTX 4070.',
      isBestSeller: true,
      isPromoted: true,
      imageAlt: 'PC Gamer ASUS ROG Strix G16 Maroc',
    },
    {
      title: 'Dell XPS 13 OLED (Core Ultra 7 / 32GB / 1TB SSD)',
      author: 'Dell',
      category: 'PC Portables',
      subCategory: 'Ultrabooks',
      price: 17490,
      originalPrice: 18990,
      costPrice: 15500,
      stock: 9,
      image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80',
      description: 'Design iconique sans bordures en aluminium usiné CNC, pavé tactile transparent et dalle OLED tactile 3K.',
      descriptionFr: 'Dell XPS 13 Ultra portable d’élite pour professionnels exigeants et mobilité totale.',
      descriptionEn: 'Dell XPS 13 OLED Laptop with Intel Core Ultra 7.',
      isBestSeller: false,
      isPromoted: false,
      imageAlt: 'Dell XPS 13 OLED Maroc',
    },
    {
      title: 'Lenovo Legion 5 Pro (Ryzen 7 / RTX 4060 / 16GB / 512GB)',
      author: 'Lenovo',
      category: 'PC Portables',
      subCategory: 'PC Gamer',
      price: 13990,
      originalPrice: 14990,
      costPrice: 12500,
      stock: 10,
      image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
      description: 'Refroidissement Legion ColdFront 5.0, écran QHD+ 165Hz et performances équilibrées pour gaming et création.',
      descriptionFr: 'Lenovo Legion 5 Pro avec processeur AMD Ryzen 7 et carte graphique RTX 4060.',
      descriptionEn: 'Lenovo Legion 5 Pro Gaming Laptop with RTX 4060.',
      isBestSeller: true,
      isPromoted: false,
      imageAlt: 'Lenovo Legion 5 Pro Maroc',
    },
    {
      title: 'HP Victus 15 Gamer (Core i5 / RTX 3050 / 16GB / 512GB)',
      author: 'HP',
      category: 'PC Portables',
      subCategory: 'PC Gamer',
      price: 7990,
      originalPrice: 8690,
      costPrice: 7100,
      stock: 16,
      image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80',
      description: 'Le meilleur rapport qualité/prix gaming pour démarrer le jeu PC en 1080p et la bureautique avancée.',
      descriptionFr: 'HP Victus 15 avec écran 144Hz, processeur Intel Core i5 et GPU RTX 3050.',
      descriptionEn: 'HP Victus 15 Gaming Laptop.',
      isBestSeller: false,
      isPromoted: false,
      imageAlt: 'HP Victus 15 Gamer Maroc',
    },

    // Audio & Casques
    {
      title: 'AirPods Pro 2 avec Boîtier MagSafe USB-C',
      author: 'Apple',
      category: 'Audio',
      subCategory: 'Écouteurs sans fil',
      price: 2790,
      originalPrice: 2990,
      costPrice: 2300,
      stock: 35,
      image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
      description: 'Réduction active du bruit 2x plus efficace, audio spatial personnalisé et boîtier résistant avec haut-parleur intégré.',
      descriptionFr: 'Apple AirPods Pro 2 avec port USB-C et son haute fidélité. Neuf et garanti.',
      descriptionEn: 'Apple AirPods Pro 2 with USB-C MagSafe Case.',
      isBestSeller: true,
      isPromoted: true,
      imageAlt: 'AirPods Pro 2 USB-C Maroc',
    },
    {
      title: 'Sony WH-1000XM5 Casque Bluetooth ANC Noir',
      author: 'Sony',
      category: 'Audio',
      subCategory: 'Casques Bluetooth',
      price: 3490,
      originalPrice: 3890,
      costPrice: 2900,
      stock: 15,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      description: 'La référence mondiale de la réduction de bruit active avec 8 micros, son Hi-Res sans fil et 30 heures d’autonomie.',
      descriptionFr: 'Casque circum-auriculaire Sony WH-1000XM5 avec son immersif et confort premium.',
      descriptionEn: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones.',
      isBestSeller: true,
      isPromoted: true,
      imageAlt: 'Sony WH-1000XM5 Maroc',
    },
    {
      title: 'JBL Charge 5 Enceinte Bluetooth Étanche IP67',
      author: 'JBL',
      category: 'Audio',
      subCategory: 'Enceintes portables',
      price: 1690,
      originalPrice: 1890,
      costPrice: 1350,
      stock: 25,
      image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
      description: 'Son Pro Original JBL puissant avec haut-parleur d’aigus séparé, 20h d’autonomie et fonction powerbank.',
      descriptionFr: 'Enceinte nomade JBL Charge 5 étanche à l’eau et à la poussière IP67.',
      descriptionEn: 'JBL Charge 5 Waterproof Bluetooth Speaker.',
      isBestSeller: false,
      isPromoted: false,
      imageAlt: 'JBL Charge 5 Maroc',
    },

    // Accessoires & Charge
    {
      title: 'Chargeur Rapide Anker Prime 67W GaN 3 Ports USB-C',
      author: 'Anker',
      category: 'Accessoires',
      subCategory: 'Chargeurs & Câbles',
      price: 590,
      originalPrice: 690,
      costPrice: 420,
      stock: 50,
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
      description: 'Technologie GaNPrime ultra-compacte capable de recharger simultanément votre MacBook, iPhone et AirPods.',
      descriptionFr: 'Chargeur mural Anker Prime 67W 3 ports (2x USB-C + 1x USB-A) avec distribution dynamique de l’énergie.',
      descriptionEn: 'Anker Prime 67W GaN Fast Charger 3-Port.',
      isBestSeller: true,
      isPromoted: false,
      imageAlt: 'Chargeur Anker Prime 67W GaN Maroc',
    },
    {
      title: 'Souris Sans Fil Logitech MX Master 3S Graphite',
      author: 'Logitech',
      category: 'Accessoires',
      subCategory: 'Claviers & Souris',
      price: 1190,
      originalPrice: 1290,
      costPrice: 950,
      stock: 35,
      image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
      description: 'La souris de précision ultime pour Mac et Windows : clics silencieux, molette MagSpeed et capteur 8000 DPI sur verre.',
      descriptionFr: 'Logitech MX Master 3S ergonomique avec connexion Bluetooth / Logi Bolt.',
      descriptionEn: 'Logitech MX Master 3S Wireless Mouse.',
      isBestSeller: true,
      isPromoted: false,
      imageAlt: 'Logitech MX Master 3S Maroc',
    },
    {
      title: 'Hub USB-C 8-en-1 Satechi Dual 4K HDMI + PD 100W',
      author: 'Satechi',
      category: 'Accessoires',
      subCategory: 'Adaptateurs',
      price: 890,
      originalPrice: 990,
      costPrice: 650,
      stock: 30,
      image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=800&q=80',
      description: 'Connectez deux écrans 4K, réseau Gigabit Ethernet, cartes SD et rechargez à pleine vitesse votre ordinateur portable.',
      descriptionFr: 'Adaptateur multiprise USB-C Satechi en aluminium brossé assorti aux MacBook et PC modernes.',
      descriptionEn: 'Satechi 8-in-1 Dual 4K HDMI USB-C Hub.',
      isBestSeller: false,
      isPromoted: false,
      imageAlt: 'Hub Satechi USB-C 8 en 1 Maroc',
    },
    {
      title: 'Disque SSD Externe Samsung T7 Shield 1TB USB 3.2',
      author: 'Samsung',
      category: 'Stockage',
      subCategory: 'Disques SSD externes',
      price: 1290,
      originalPrice: 1450,
      costPrice: 1050,
      stock: 25,
      image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
      description: 'Vitesse de transfert fulgurante jusqu’à 1050 Mo/s, boîtier blindé antichoc et certification IP65 eau et poussière.',
      descriptionFr: 'Samsung T7 Shield 1000 Go compatible Mac, PC, Android et consoles de jeux.',
      descriptionEn: 'Samsung T7 Shield 1TB Rugged External SSD.',
      isBestSeller: true,
      isPromoted: false,
      imageAlt: 'Samsung T7 Shield SSD 1TB Maroc',
    },
  ]

  console.log(`Insertion de ${techProducts.length} produits technologiques...`)
  const createdBooks = []

  for (const prod of techProducts) {
    const existing = await prisma.book.findFirst({ where: { title: prod.title } })
    if (existing) {
      const updated = await prisma.book.update({
        where: { id: existing.id },
        data: prod,
      })
      createdBooks.push(updated)
    } else {
      const created = await prisma.book.create({
        data: prod,
      })
      createdBooks.push(created)
    }
  }

  // 6. Packs Promotionnels Tech
  console.log('Configuration des packs promotionnels...')
  const packsData = [
    {
      name: 'Pack Apple Nomade Pro',
      nameFr: 'Pack Apple Nomade Pro',
      nameEn: 'Apple Nomad Pro Bundle',
      price: 16990,
      originalPrice: 18170,
      description: 'La combinaison nomade idéale : MacBook Air M3 + AirPods Pro 2 + Hub USB-C Satechi.',
      descriptionFr: 'MacBook Air 13 pouces M3 + écouteurs AirPods Pro 2 MagSafe + adaptateur multiprise USB-C 8-en-1.',
      descriptionEn: 'MacBook Air M3 + AirPods Pro 2 + USB-C Hub bundle.',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
      isFreeDelivery: true,
      isPromoted: true,
      active: true,
      booksToLink: [
        "MacBook Air 13 pouces Puce M3 16GB RAM 512GB SSD Minuit",
        'AirPods Pro 2 avec Boîtier MagSafe USB-C',
        'Hub USB-C 8-en-1 Satechi Dual 4K HDMI + PD 100W',
      ],
    },
    {
      name: 'Pack Smartphone Power Ultimate',
      nameFr: 'Pack Smartphone Power Ultimate',
      nameEn: 'Smartphone Ultimate Power Pack',
      price: 15790,
      originalPrice: 16270,
      description: 'L’iPhone 16 Pro Max avec sa station de charge rapide Anker 67W GaN Prime.',
      descriptionFr: 'iPhone 16 Pro Max 256GB + Chargeur Anker 67W GaN compact pour ne jamais manquer d’énergie.',
      descriptionEn: 'iPhone 16 Pro Max 256GB + Anker 67W GaN fast charger.',
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
      isFreeDelivery: true,
      isPromoted: true,
      active: true,
      booksToLink: [
        'iPhone 16 Pro Max 256GB Titane Naturel',
        'Chargeur Rapide Anker Prime 67W GaN 3 Ports USB-C',
      ],
    },
    {
      name: 'Pack Créatif & Setup Bureau',
      nameFr: 'Pack Créatif & Setup Bureau',
      nameEn: 'Creative Desktop Workspace Pack',
      price: 2990,
      originalPrice: 3370,
      description: 'Boostez votre confort de travail : Souris MX Master 3S + SSD Externe 1TB Samsung T7 + Hub USB-C.',
      descriptionFr: 'Souris Logitech MX Master 3S + SSD Samsung T7 Shield 1To + Hub Satechi 8-en-1.',
      descriptionEn: 'Logitech MX Master 3S + Samsung T7 1TB SSD + Satechi Hub bundle.',
      image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
      isFreeDelivery: true,
      isPromoted: false,
      active: true,
      booksToLink: [
        'Souris Sans Fil Logitech MX Master 3S Graphite',
        'Disque SSD Externe Samsung T7 Shield 1TB USB 3.2',
        'Hub USB-C 8-en-1 Satechi Dual 4K HDMI + PD 100W',
      ],
    },
  ]

  for (const p of packsData) {
    const { booksToLink, ...packData } = p
    const existingPack = await prisma.pack.findFirst({ where: { name: p.name } })
    let packRecord
    if (existingPack) {
      packRecord = await prisma.pack.update({ where: { id: existingPack.id }, data: packData })
    } else {
      packRecord = await prisma.pack.create({ data: packData })
    }

    // Lier les produits du pack
    for (const bookTitle of booksToLink) {
      const b = createdBooks.find(item => item.title === bookTitle)
      if (b) {
        const link = await prisma.packBook.findFirst({
          where: { packId: packRecord.id, bookId: b.id },
        })
        if (!link) {
          await prisma.packBook.create({
            data: { packId: packRecord.id, bookId: b.id },
          })
        }
      }
    }
  }

  // 6. Entrepôts logistiques par défaut
  const defaultWarehouses = [
    { name: 'Entrepôt Principal', location: 'Casablanca, Maroc', active: true },
    { name: 'Entrepôt Rabat', location: 'Rabat, Maroc', active: true },
    { name: 'Entrepôt Marrakech', location: 'Marrakech, Maroc', active: true },
  ]

  for (const wh of defaultWarehouses) {
    const existingWh = await prisma.warehouse.findFirst({ where: { name: wh.name } })
    if (!existingWh) {
      await prisma.warehouse.create({ data: wh })
    } else {
      await prisma.warehouse.update({ where: { id: existingWh.id }, data: { active: true } })
    }
  }

  console.log('Seed Tekno Store terminé avec succès !')
}

main()
  .catch((error) => {
    console.error('Erreur lors du seed :', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
