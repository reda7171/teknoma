import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

interface ProductSeed {
  title: string
  titleFr: string
  titleEn: string
  author: string // Brand
  category: string
  subCategory: string
  price: number
  originalPrice: number
  costPrice: number
  stock: number
  image: string
  description: string
  descriptionFr: string
  descriptionEn: string
  isBestSeller?: boolean
  isPromoted?: boolean
}

const PRODUCTS: ProductSeed[] = [
  // ================= SMARTPHONES =================
  {
    title: 'iPhone 16 Pro Max 256GB Titane Naturel',
    titleFr: 'iPhone 16 Pro Max 256GB Titane Naturel',
    titleEn: 'iPhone 16 Pro Max 256GB Natural Titanium',
    author: 'Apple',
    category: 'Smartphones',
    subCategory: 'Apple iPhone',
    price: 14990,
    originalPrice: 15990,
    costPrice: 13200,
    stock: 18,
    image: '/book-placeholder.png',
    description: 'Le fleuron d’Apple avec puce A18 Pro gravée en 3nm, châssis titane ultraléger, bouton Commande de l’appareil photo et autonomie record.',
    descriptionFr: 'iPhone 16 Pro Max 256GB Titane Naturel avec puce A18 Pro et téléobjectif 5x. Garantie 1 an constructeur, neuf sous blister scellé.',
    descriptionEn: 'iPhone 16 Pro Max 256GB Natural Titanium with A18 Pro chip and 5x telephoto camera. 1-year official warranty.',
    isBestSeller: true,
    isPromoted: true
  },
  {
    title: 'iPhone 15 128GB Noir Sidéral',
    titleFr: 'iPhone 15 128GB Noir Sidéral',
    titleEn: 'iPhone 15 128GB Space Black',
    author: 'Apple',
    category: 'Smartphones',
    subCategory: 'Apple iPhone',
    price: 8490,
    originalPrice: 9290,
    costPrice: 7500,
    stock: 22,
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80',
    description: 'Dynamic Island, capteur principal 48 Mpx haute résolution, port USB-C universel et puce A16 Bionic surpuissante.',
    descriptionFr: 'iPhone 15 128GB Noir Sidéral neuf garanti. Écran Super Retina XDR 6.1 pouces avec Dynamic Island.',
    descriptionEn: 'iPhone 15 128GB Space Black with Dynamic Island and 48MP main camera.',
    isBestSeller: true
  },
  {
    title: 'Samsung Galaxy S24 Ultra 512GB Gris Titane',
    titleFr: 'Samsung Galaxy S24 Ultra 512GB Gris Titane',
    titleEn: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
    author: 'Samsung',
    category: 'Smartphones',
    subCategory: 'Samsung Galaxy',
    price: 13490,
    originalPrice: 14490,
    costPrice: 11900,
    stock: 14,
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
    description: 'Galaxy AI intégrée, processeur Snapdragon 8 Gen 3 for Galaxy, capteur photo 200 Mpx et stylet S Pen intégré.',
    descriptionFr: 'Samsung Galaxy S24 Ultra 512GB Gris Titane avec Galaxy AI, écran Dynamic AMOLED 2X 120Hz et stylet S Pen.',
    descriptionEn: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray featuring Galaxy AI and built-in S Pen.',
    isBestSeller: true,
    isPromoted: true
  },
  {
    title: 'Samsung Galaxy Z Fold 6 256GB Noir Fantôme',
    titleFr: 'Samsung Galaxy Z Fold 6 256GB Noir Fantôme',
    titleEn: 'Samsung Galaxy Z Fold 6 256GB Phantom Black',
    author: 'Samsung',
    category: 'Smartphones',
    subCategory: 'Samsung Galaxy',
    price: 17990,
    originalPrice: 19490,
    costPrice: 15800,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80',
    description: 'L’expérience pliable ultime : écran immersif 7.6 pouces, charnière ultra-robuste Armor Aluminum et multitâche poussé.',
    descriptionFr: 'Samsung Galaxy Z Fold 6 256GB pliable avec double écran AMOLED 120Hz, Galaxy AI et productivité multitâche sans limites.',
    descriptionEn: 'Samsung Galaxy Z Fold 6 256GB Phantom Black foldable phone with 7.6-inch main display and Galaxy AI.',
    isPromoted: true
  },
  {
    title: 'Xiaomi 14 Ultra 512GB Noir Leica',
    titleFr: 'Xiaomi 14 Ultra 512GB Noir Leica',
    titleEn: 'Xiaomi 14 Ultra 512GB Leica Black',
    author: 'Xiaomi',
    category: 'Smartphones',
    subCategory: 'Xiaomi',
    price: 9990,
    originalPrice: 10990,
    costPrice: 8700,
    stock: 10,
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
    description: 'Optique professionnelle Leica Summilux à 4 capteurs 50 Mpx, capteur 1 pouce LYT-900 et Snapdragon 8 Gen 3.',
    descriptionFr: 'Xiaomi 14 Ultra 512GB conçu en partenariat avec Leica. La meilleure expérience photo mobile sous Android.',
    descriptionEn: 'Xiaomi 14 Ultra 512GB Leica flagship smartphone with Snapdragon 8 Gen 3 and quad 50MP cameras.',
    isBestSeller: true
  },
  {
    title: 'Google Pixel 9 Pro 128GB Porcelaine',
    titleFr: 'Google Pixel 9 Pro 128GB Porcelaine',
    titleEn: 'Google Pixel 9 Pro 128GB Porcelain',
    author: 'Google',
    category: 'Smartphones',
    subCategory: 'Google Pixel',
    price: 9890,
    originalPrice: 10790,
    costPrice: 8500,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
    description: 'Puce Google Tensor G4, IA Gemini avancée intégrée, photo de nuit exceptionnelle et 7 ans de mises à jour Android garanties.',
    descriptionFr: 'Google Pixel 9 Pro 128GB Porcelaine avec puce Google Tensor G4 et suite IA Gemini pour des retouches et photos inégalées.',
    descriptionEn: 'Google Pixel 9 Pro 128GB Porcelain with Google Tensor G4 chip and advanced Gemini AI capabilities.',
    isBestSeller: false
  },

  // ================= PC PORTABLES =================
  {
    title: 'Dell XPS 13 OLED (Core Ultra 7 / 32GB / 1TB SSD)',
    titleFr: 'Dell XPS 13 OLED (Core Ultra 7 / 32GB / 1TB SSD)',
    titleEn: 'Dell XPS 13 OLED (Core Ultra 7 / 32GB / 1TB SSD)',
    author: 'Dell',
    category: 'PC Portables',
    subCategory: 'Ultrabooks',
    price: 17490,
    originalPrice: 18990,
    costPrice: 15200,
    stock: 10,
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80',
    description: 'Châssis aluminium usiné CNC ultra-fin, écran tactile OLED 3K InfinityEdge et processeur Intel Core Ultra 7 avec NPU IA.',
    descriptionFr: 'Dell XPS 13 9340 avec écran 3K OLED, 32GB LPDDR5X et 1TB SSD NVMe. Ultrabook d’exception pour créateurs et professionnels.',
    descriptionEn: 'Dell XPS 13 with 3K OLED InfinityEdge touch display, Intel Core Ultra 7, 32GB RAM and 1TB SSD.',
    isBestSeller: true,
    isPromoted: true
  },
  {
    title: 'HP Victus 15 Gamer (Core i5 / RTX 3050 / 16GB / 512GB)',
    titleFr: 'HP Victus 15 Gamer (Core i5 / RTX 3050 / 16GB / 512GB)',
    titleEn: 'HP Victus 15 Gaming Laptop (Core i5 / RTX 3050 / 16GB / 512GB)',
    author: 'HP',
    category: 'PC Portables',
    subCategory: 'PC Gamer',
    price: 7990,
    originalPrice: 8790,
    costPrice: 6800,
    stock: 16,
    image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80',
    description: 'Écran 15.6 pouces 144Hz FHD, carte graphique Nvidia GeForce RTX 3050 6GB et refroidissement thermique optimisé.',
    descriptionFr: 'HP Victus 15 gamer haute performance pour eSport et études techniques. Écran fluide 144Hz et carte Nvidia RTX.',
    descriptionEn: 'HP Victus 15 gaming laptop with 144Hz FHD display, Intel Core i5 and Nvidia GeForce RTX 3050 graphics.',
    isBestSeller: true
  },
  {
    title: 'Lenovo Legion 5 Pro (Ryzen 7 / RTX 4060 / 16GB / 512GB)',
    titleFr: 'Lenovo Legion 5 Pro (Ryzen 7 / RTX 4060 / 16GB / 512GB)',
    titleEn: 'Lenovo Legion 5 Pro (Ryzen 7 / RTX 4060 / 16GB / 512GB)',
    author: 'Lenovo',
    category: 'PC Portables',
    subCategory: 'PC Gamer',
    price: 13990,
    originalPrice: 14990,
    costPrice: 12200,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
    description: 'Écran WQXGA 16 pouces 165Hz 500 nits, processeur AMD Ryzen 7 série 7000 et carte Nvidia RTX 4060 8GB TGP 140W.',
    descriptionFr: 'Lenovo Legion 5 Pro conçu pour le gaming compétitif et le montage vidéo 4K. Clavier Legion TrueStrike RGB.',
    descriptionEn: 'Lenovo Legion 5 Pro gaming notebook with AMD Ryzen 7, Nvidia RTX 4060 and 165Hz WQXGA panel.',
    isBestSeller: true
  },
  {
    title: 'ASUS ROG Strix G16 (i9-14900HX / RTX 4070 / 32GB / 1TB)',
    titleFr: 'ASUS ROG Strix G16 (i9-14900HX / RTX 4070 / 32GB / 1TB)',
    titleEn: 'ASUS ROG Strix G16 (i9-14900HX / RTX 4070 / 32GB / 1TB)',
    author: 'Asus',
    category: 'PC Portables',
    subCategory: 'PC Gamer',
    price: 18990,
    originalPrice: 20490,
    costPrice: 16700,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80',
    description: 'Monstre de puissance ROG Nebula Display 240Hz, métal liquide Conductonaut Extreme et Nvidia RTX 4070 140W.',
    descriptionFr: 'ASUS ROG Strix G16 2024 avec Intel Core i9 24 cœurs, écran QHD+ 240Hz et carte graphique RTX 4070 pour gamers exigeants.',
    descriptionEn: 'ASUS ROG Strix G16 with Intel Core i9-14900HX, RTX 4070, 32GB RAM and 240Hz ROG Nebula display.',
    isPromoted: true
  },
  {
    title: 'Lenovo ThinkPad X1 Carbon Gen 11 Core i7 16GB 512GB',
    titleFr: 'Lenovo ThinkPad X1 Carbon Gen 11 Core i7 16GB 512GB',
    titleEn: 'Lenovo ThinkPad X1 Carbon Gen 11 Core i7 16GB 512GB',
    author: 'Lenovo',
    category: 'PC Portables',
    subCategory: 'Ultrabooks',
    price: 16490,
    originalPrice: 17990,
    costPrice: 14300,
    stock: 9,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
    description: 'La référence professionnelle mondiale en fibre de carbone ultra-légère (1.12 kg), autonomie longue durée et robustesse militaire MIL-STD 810H.',
    descriptionFr: 'Lenovo ThinkPad X1 Carbon ultraléger pour dirigeants et professionnels nomades. Sécurité biométrique et clavier primé.',
    descriptionEn: 'Lenovo ThinkPad X1 Carbon Gen 11 business ultrabook with Intel Core i7, 16GB RAM and carbon-fiber durability.',
    isBestSeller: false
  },
  {
    title: 'HP Spectre x360 14 OLED 2-en-1 Core Ultra 7 32GB 1TB',
    titleFr: 'HP Spectre x360 14 OLED 2-en-1 Core Ultra 7 32GB 1TB',
    titleEn: 'HP Spectre x360 14 OLED 2-in-1 Core Ultra 7 32GB 1TB',
    author: 'HP',
    category: 'PC Portables',
    subCategory: 'Ultrabooks',
    price: 17990,
    originalPrice: 19290,
    costPrice: 15600,
    stock: 7,
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    description: 'Design convertible 360° en aluminium gem-cut, superbe écran tactile 2.8K OLED 120Hz et caméra 9 Mpx boostée à l’IA.',
    descriptionFr: 'HP Spectre x360 14 convertible avec stylet HP rechargeable inclus. Écran tactile OLED et son Bang & Olufsen.',
    descriptionEn: 'HP Spectre x360 14 2-in-1 convertible OLED laptop with Intel Core Ultra 7 and rechargeable stylus included.',
    isPromoted: false
  },

  // ================= MAC & APPLE =================
  {
    title: 'MacBook Pro 14 pouces Puce M3 Pro 18GB RAM 512GB Noir Sidéral',
    titleFr: 'MacBook Pro 14 pouces Puce M3 Pro 18GB RAM 512GB Noir Sidéral',
    titleEn: 'MacBook Pro 14-inch M3 Pro 18GB RAM 512GB Space Black',
    author: 'Apple',
    category: 'Mac & Apple',
    subCategory: 'MacBook Pro',
    price: 21990,
    originalPrice: 23490,
    costPrice: 19500,
    stock: 11,
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
    description: 'Puce M3 Pro avec CPU 11 cœurs et GPU 14 cœurs, écran Liquid Retina XDR Mini-LED 120Hz et finition Noir Sidéral anodisée anti-traces.',
    descriptionFr: 'MacBook Pro 14 pouces M3 Pro pour graphistes, monteurs et développeurs. Puissance extrême et jusqu’à 18h d’autonomie.',
    descriptionEn: 'MacBook Pro 14-inch with Apple M3 Pro chip, Liquid Retina XDR display, 18GB unified memory and 512GB SSD.',
    isBestSeller: true,
    isPromoted: true
  },
  {
    title: 'MacBook Air 13 pouces Puce M3 16GB RAM 512GB SSD Minuit',
    titleFr: 'MacBook Air 13 pouces Puce M3 16GB RAM 512GB SSD Minuit',
    titleEn: 'MacBook Air 13-inch M3 Chip 16GB RAM 512GB SSD Midnight',
    author: 'Apple',
    category: 'Mac & Apple',
    subCategory: 'MacBook Air',
    price: 14490,
    originalPrice: 15490,
    costPrice: 12900,
    stock: 16,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    description: 'Finesse remarquable de 11.3 mm, autonomie jusqu’à 18 heures, silence absolu sans ventilateur et prise en charge de 2 écrans externes.',
    descriptionFr: 'MacBook Air 13 pouces M3 avec 16GB de mémoire unifiée et 512GB SSD. Le compagnon idéal pour le travail nomade.',
    descriptionEn: 'MacBook Air 13-inch with M3 chip, 16GB unified memory, 512GB SSD, fanless silent operation and 18-hour battery.',
    isBestSeller: true
  },
  {
    title: 'iPad Pro 11 pouces M4 OLED 256GB Wi-Fi Argent',
    titleFr: 'iPad Pro 11 pouces M4 OLED 256GB Wi-Fi Argent',
    titleEn: 'iPad Pro 11-inch M4 OLED 256GB Wi-Fi Silver',
    author: 'Apple',
    category: 'Mac & Apple',
    subCategory: 'iPad Pro / Air',
    price: 11490,
    originalPrice: 12290,
    costPrice: 10100,
    stock: 15,
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80',
    description: 'Nouvel écran Ultra Retina XDR Tandem OLED révolutionnaire, puce Apple M4 ultra-fine (5.3 mm) et puissance graphique avec ray tracing.',
    descriptionFr: 'iPad Pro 11 M4 Tandem OLED pour artistes et créatifs. Compatible avec l’Apple Pencil Pro et Magic Keyboard.',
    descriptionEn: 'iPad Pro 11-inch featuring breakthrough Ultra Retina XDR Tandem OLED and Apple M4 chip performance.',
    isBestSeller: true
  },
  {
    title: 'Apple Watch Series 10 GPS 46mm Noir de Jais',
    titleFr: 'Apple Watch Series 10 GPS 46mm Noir de Jais',
    titleEn: 'Apple Watch Series 10 GPS 46mm Jet Black',
    author: 'Apple',
    category: 'Mac & Apple',
    subCategory: 'Apple Watch',
    price: 5490,
    originalPrice: 5890,
    costPrice: 4800,
    stock: 18,
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
    description: 'Boîtier en aluminium poli le plus fin jamais conçu, écran OLED grand angle jusqu’à 40% plus lumineux et détection de l’apnée du sommeil.',
    descriptionFr: 'Apple Watch Series 10 46mm Noir de Jais avec capteurs santé de pointe, ECG, suivi de sommeil et charge ultra-rapide.',
    descriptionEn: 'Apple Watch Series 10 46mm Jet Black with wide-angle OLED display and advanced health tracking features.',
    isBestSeller: false
  },
  {
    title: 'Apple Watch Ultra 2 GPS + Cellular 49mm Boîtier Titane',
    titleFr: 'Apple Watch Ultra 2 GPS + Cellular 49mm Boîtier Titane',
    titleEn: 'Apple Watch Ultra 2 GPS + Cellular 49mm Titanium Case',
    author: 'Apple',
    category: 'Mac & Apple',
    subCategory: 'Apple Watch',
    price: 9990,
    originalPrice: 10790,
    costPrice: 8800,
    stock: 9,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    description: 'Boîtier titane aérospatial 49mm, écran de 3000 nits, bouton Action personnalisable, GPS double fréquence et jusqu’à 72h d’autonomie.',
    descriptionFr: 'Apple Watch Ultra 2 Titane pour sportifs et aventuriers. Résistante à l’eau jusqu’à 100m avec certification de plongée EN13319.',
    descriptionEn: 'Apple Watch Ultra 2 in 49mm titanium case with 3000-nit display and dual-frequency precision GPS.',
    isPromoted: true
  },
  {
    title: 'Apple Mac mini Puce M2 Pro 16GB RAM 512GB SSD',
    titleFr: 'Apple Mac mini Puce M2 Pro 16GB RAM 512GB SSD',
    titleEn: 'Apple Mac mini M2 Pro Chip 16GB RAM 512GB SSD',
    author: 'Apple',
    category: 'Mac & Apple',
    subCategory: 'iMac & Mac mini',
    price: 13990,
    originalPrice: 14990,
    costPrice: 12400,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80',
    description: 'Boîtier compact légendaire de 19.7 cm de côté, 4 ports Thunderbolt 4, sortie HDMI 8K et performances M2 Pro dignes d’un studio.',
    descriptionFr: 'Apple Mac mini M2 Pro pour montage vidéo 8K, modélisation 3D et développement. Connectique ultra-complète.',
    descriptionEn: 'Apple Mac mini desktop computer with M2 Pro chip, 16GB unified memory, 512GB SSD and 4 Thunderbolt 4 ports.',
    isBestSeller: false
  },

  // ================= ACCESSOIRES =================
  {
    title: 'Chargeur Rapide Anker Prime 67W GaN 3 Ports USB-C',
    titleFr: 'Chargeur Rapide Anker Prime 67W GaN 3 Ports USB-C',
    titleEn: 'Anker Prime 67W GaN 3-Port USB-C Fast Wall Charger',
    author: 'Anker',
    category: 'Accessoires',
    subCategory: 'Chargeurs & Câbles',
    price: 590,
    originalPrice: 690,
    costPrice: 420,
    stock: 50,
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
    description: 'Technologie GaNPrime ultra-compacte capable de recharger simultanément votre MacBook, iPhone et AirPods en toute sécurité.',
    descriptionFr: 'Chargeur mural Anker Prime 67W 3 ports (2x USB-C + 1x USB-A) avec distribution dynamique de l’énergie.',
    descriptionEn: 'Anker Prime 67W GaN 3-Port compact wall charger with smart dynamic power allocation.',
    isBestSeller: true
  },
  {
    title: 'Souris Sans Fil Logitech MX Master 3S Graphite',
    titleFr: 'Souris Sans Fil Logitech MX Master 3S Graphite',
    titleEn: 'Logitech MX Master 3S Wireless Mouse Graphite',
    author: 'Logitech',
    category: 'Accessoires',
    subCategory: 'Claviers & Souris',
    price: 1190,
    originalPrice: 1390,
    costPrice: 890,
    stock: 35,
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
    description: 'Capteur optique 8000 DPI fonctionnant même sur le verre, défilement électromagnétique MagSpeed et clics silencieux Quiet Clicks.',
    descriptionFr: 'Logitech MX Master 3S ergonomique pour bureautique avancée et graphisme. Autonomie 70 jours sur une charge.',
    descriptionEn: 'Logitech MX Master 3S ergonomic wireless mouse with 8000 DPI track-on-glass sensor and MagSpeed wheel.',
    isBestSeller: true
  },
  {
    title: 'Clavier Sans Fil Logitech MX Keys S Rétroéclairé Graphite',
    titleFr: 'Clavier Sans Fil Logitech MX Keys S Rétroéclairé Graphite',
    titleEn: 'Logitech MX Keys S Wireless Backlit Keyboard Graphite',
    author: 'Logitech',
    category: 'Accessoires',
    subCategory: 'Claviers & Souris',
    price: 1290,
    originalPrice: 1450,
    costPrice: 960,
    stock: 28,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    description: 'Touches concaves Perfect Stroke adaptées au bout des doigts, rétroéclairage intelligent avec capteurs de proximité et Smart Actions.',
    descriptionFr: 'Logitech MX Keys S clavier premium multi-dispositifs (Mac / Windows / iOS / Android) avec frappe fluide et silencieuse.',
    descriptionEn: 'Logitech MX Keys S advanced wireless illuminated keyboard with smart backlighting and programmable smart actions.',
    isBestSeller: true
  },
  {
    title: 'Hub USB-C 8-en-1 Satechi Dual 4K HDMI + PD 100W',
    titleFr: 'Hub USB-C 8-en-1 Satechi Dual 4K HDMI + PD 100W',
    titleEn: 'Satechi 8-in-1 Dual 4K HDMI USB-C Multiport Hub',
    author: 'Satechi',
    category: 'Accessoires',
    subCategory: 'Adaptateurs',
    price: 890,
    originalPrice: 1050,
    costPrice: 650,
    stock: 30,
    image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=800&q=80',
    description: 'Corps aluminium finition sidérale, double sortie 4K HDMI 60Hz, Gigabit Ethernet, lecteurs SD/microSD et charge pass-through 100W.',
    descriptionFr: 'Adaptateur multiprise Satechi USB-C pour MacBook, iPad Pro et PC portables. Solution tout-en-un pour poste de travail complet.',
    descriptionEn: 'Satechi 8-in-1 USB-C Hub with Dual 4K HDMI, 100W Power Delivery pass-through and Gigabit Ethernet.',
    isBestSeller: true
  },
  {
    title: 'Support PC Portable Aluminium Ugreen Ergonomique Ajustable',
    titleFr: 'Support PC Portable Aluminium Ugreen Ergonomique Ajustable',
    titleEn: 'Ugreen Ergonomic Aluminum Adjustable Laptop Stand',
    author: 'Ugreen',
    category: 'Accessoires',
    subCategory: 'Supports & Docks',
    price: 390,
    originalPrice: 490,
    costPrice: 240,
    stock: 45,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
    description: 'Alliage d’aluminium robuste pliable, 5 angles d’élévation pour soulager le cou et évacuation optimale de la chaleur sous le PC.',
    descriptionFr: 'Support Ugreen pliable pour ordinateurs portables de 11 à 17.3 pouces. Patins en silicone antidérapants.',
    descriptionEn: 'Ugreen foldable aluminum laptop stand with multiple height angles and heat dissipation design.',
    isBestSeller: false
  },
  {
    title: 'Chargeur Sans Fil Apple MagSafe Rapide 15W avec Câble Tressé',
    titleFr: 'Chargeur Sans Fil Apple MagSafe Rapide 15W avec Câble Tressé',
    titleEn: 'Apple MagSafe 15W Fast Wireless Charger Braided Cable',
    author: 'Apple',
    category: 'Accessoires',
    subCategory: 'Chargeurs & Câbles',
    price: 490,
    originalPrice: 590,
    costPrice: 380,
    stock: 40,
    image: '/book-placeholder.png',
    description: 'Aimants intégrés parfaitement ajustés pour iPhone et AirPods, puissance jusqu’à 15W et câble tressé haute durabilité.',
    descriptionFr: 'Chargeur induction officiel Apple MagSafe avec câble tressé 1M. Compatible iPhone 12 à 16 et boîtiers AirPods.',
    descriptionEn: 'Official Apple MagSafe wireless charger delivering up to 15W fast wireless charging with braided cable.',
    isBestSeller: false
  },

  // ================= AUDIO =================
  {
    title: 'AirPods Pro 2 avec Boîtier MagSafe USB-C',
    titleFr: 'AirPods Pro 2 avec Boîtier MagSafe USB-C',
    titleEn: 'AirPods Pro 2 with MagSafe Charging Case USB-C',
    author: 'Apple',
    category: 'Audio',
    subCategory: 'Écouteurs sans fil',
    price: 2790,
    originalPrice: 2990,
    costPrice: 2300,
    stock: 35,
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
    description: 'Réduction active du bruit 2x plus efficace, mode Transparence adaptative, Audio spatial personnalisé avec suivi des mouvements de la tête.',
    descriptionFr: 'Apple AirPods Pro 2 avec port USB-C et son haute fidélité. Puce H2, résistance IP54 à la poussière, transpiration et eau.',
    descriptionEn: 'Apple AirPods Pro 2 with USB-C MagSafe case, powered by Apple H2 chip with 2x more Active Noise Cancellation.',
    isBestSeller: true,
    isPromoted: true
  },
  {
    title: 'Sony WH-1000XM5 Casque Bluetooth ANC Noir',
    titleFr: 'Sony WH-1000XM5 Casque Bluetooth ANC Noir',
    titleEn: 'Sony WH-1000XM5 Wireless ANC Headphones Black',
    author: 'Sony',
    category: 'Audio',
    subCategory: 'Casques Bluetooth',
    price: 3690,
    originalPrice: 4190,
    costPrice: 3000,
    stock: 16,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    description: 'Le meilleur réducteur de bruit du marché avec deux processeurs et 8 micros, son Hi-Res sans fil LDAC et 30h d’autonomie.',
    descriptionFr: 'Casque circum-aural Sony WH-1000XM5 avec réduction de bruit active intelligente Auto NC Optimizer et confort ultraléger.',
    descriptionEn: 'Sony WH-1000XM5 industry-leading noise canceling wireless headphones with Auto NC Optimizer and 30-hour battery.',
    isBestSeller: true,
    isPromoted: true
  },
  {
    title: 'Casque Bose QuietComfort Ultra avec Audio Spatial Noir',
    titleFr: 'Casque Bose QuietComfort Ultra avec Audio Spatial Noir',
    titleEn: 'Bose QuietComfort Ultra Wireless Headphones Black',
    author: 'Bose',
    category: 'Audio',
    subCategory: 'Casques Bluetooth',
    price: 4390,
    originalPrice: 4890,
    costPrice: 3600,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    description: 'Son immersif révolutionnaire Bose Immersive Audio, réduction active de bruit CustomTune calibrée sur votre conduit auditif et 24h d’écoute.',
    descriptionFr: 'Bose QuietComfort Ultra avec coussinets en cuir protéiné ultra-doux, microphones à rejet de bruit pour appels cristallins.',
    descriptionEn: 'Bose QuietComfort Ultra flagship wireless noise canceling headphones with spatial audio technology.',
    isBestSeller: false
  },
  {
    title: 'JBL Charge 5 Enceinte Bluetooth Étanche IP67',
    titleFr: 'JBL Charge 5 Enceinte Bluetooth Étanche IP67',
    titleEn: 'JBL Charge 5 Waterproof Portable Bluetooth Speaker',
    author: 'JBL',
    category: 'Audio',
    subCategory: 'Enceintes portables',
    price: 1590,
    originalPrice: 1790,
    costPrice: 1250,
    stock: 25,
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    description: 'Son JBL Original Pro puissant avec haut-parleur d’aigus indépendant et deux radiateurs de basses passifs, autonomie 20h et fonction powerbank.',
    descriptionFr: 'Enceinte nomade JBL Charge 5 étanche à l’eau et à la poussière. Batterie intégrée pour recharger vos appareils en déplacement.',
    descriptionEn: 'JBL Charge 5 portable Bluetooth speaker with IP67 waterproof and dustproof design plus built-in powerbank.',
    isBestSeller: true
  },
  {
    title: 'Écouteurs Sans Fil Sony WF-1000XM5 Hi-Res Audio Réduction Bruit',
    titleFr: 'Écouteurs Sans Fil Sony WF-1000XM5 Hi-Res Audio Réduction Bruit',
    titleEn: 'Sony WF-1000XM5 Truly Wireless Noise Canceling Earbuds',
    author: 'Sony',
    category: 'Audio',
    subCategory: 'Écouteurs sans fil',
    price: 2690,
    originalPrice: 2990,
    costPrice: 2150,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    description: 'Diaphragme Dynamic Driver X pour des basses profondes et voix claires, processeur HD QN2e et compatibilité Hi-Res Audio Wireless LDAC.',
    descriptionFr: 'Écouteurs intra-auriculaires Sony WF-1000XM5 ultra-compacts avec réduction de bruit exceptionnelle et embouts à isolation phonique.',
    descriptionEn: 'Sony WF-1000XM5 premium wireless earbuds featuring Dynamic Driver X and Dual Processor noise cancellation.',
    isBestSeller: false
  },
  {
    title: 'Enceinte Portable JBL Flip 6 Bluetooth Étanche IP67 Noir',
    titleFr: 'Enceinte Portable JBL Flip 6 Bluetooth Étanche IP67 Noir',
    titleEn: 'JBL Flip 6 Portable Waterproof Bluetooth Speaker Black',
    author: 'JBL',
    category: 'Audio',
    subCategory: 'Enceintes portables',
    price: 1090,
    originalPrice: 1290,
    costPrice: 850,
    stock: 30,
    image: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=800&q=80',
    description: 'Système de haut-parleurs à 2 voies offrant un son puissant et cristallin, autonomie 12h, format cylindrique nomade ultra-robuste.',
    descriptionFr: 'JBL Flip 6 compacte et résistante aux chocs et éclaboussures. Connectez plusieurs enceintes avec la fonction PartyBoost.',
    descriptionEn: 'JBL Flip 6 ultra-portable waterproof Bluetooth speaker with 2-way speaker system and PartyBoost.',
    isBestSeller: false
  },

  // ================= STOCKAGE =================
  {
    title: 'Disque SSD Externe Samsung T7 Shield 1TB USB 3.2',
    titleFr: 'Disque SSD Externe Samsung T7 Shield 1TB USB 3.2',
    titleEn: 'Samsung T7 Shield 1TB USB 3.2 Rugged External SSD',
    author: 'Samsung',
    category: 'Stockage',
    subCategory: 'Disques SSD externes',
    price: 1290,
    originalPrice: 1490,
    costPrice: 990,
    stock: 25,
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
    description: 'Vitesses de transfert jusqu’à 1050 Mo/s en lecture séquentielle, coque en élastomère résistant aux chutes de 3 mètres et indice IP65.',
    descriptionFr: 'Samsung T7 Shield 1TB antichoc, étanche eau et poussière. Compatible Mac, PC, smartphones Android et caméras.',
    descriptionEn: 'Samsung T7 Shield 1TB rugged portable SSD with up to 1050 MB/s read speeds and IP65 dust/water resistance.',
    isBestSeller: true,
    isPromoted: true
  },
  {
    title: 'Disque SSD Externe SanDisk Extreme Portable 2TB 1050Mo/s',
    titleFr: 'Disque SSD Externe SanDisk Extreme Portable 2TB 1050Mo/s',
    titleEn: 'SanDisk Extreme Portable 2TB 1050MB/s Rugged External SSD',
    author: 'SanDisk',
    category: 'Stockage',
    subCategory: 'Disques SSD externes',
    price: 2190,
    originalPrice: 2490,
    costPrice: 1750,
    stock: 18,
    image: 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?auto=format&fit=crop&w=800&q=80',
    description: 'Capacité colossale de 2 To, mousqueton intégré pour fixation à votre sac à dos, protection IP65 et cryptage matériel AES 256 bits.',
    descriptionFr: 'SanDisk Extreme Portable 2TB haute vitesse pour photographes et vidéastes nomades. Résistant à l’eau et aux chocs.',
    descriptionEn: 'SanDisk Extreme 2TB portable NVMe SSD delivering up to 1050 MB/s with carabiner loop and IP65 durability.',
    isBestSeller: true
  },
  {
    title: 'Disque SSD Externe Crucial X9 Pro 1TB USB 3.2 Gen2',
    titleFr: 'Disque SSD Externe Crucial X9 Pro 1TB USB 3.2 Gen2',
    titleEn: 'Crucial X9 Pro 1TB Portable SSD USB 3.2 Gen2',
    author: 'Crucial',
    category: 'Stockage',
    subCategory: 'Disques SSD externes',
    price: 1190,
    originalPrice: 1350,
    costPrice: 910,
    stock: 22,
    image: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80',
    description: 'Format miniature ultra-léger (38 grammes) en aluminium anodisé avec base en caoutchouc souple, transferts jusqu’à 1050 Mo/s.',
    descriptionFr: 'Crucial X9 Pro 1TB conçu pour charger vos bibliothèques photos et vidéos instantanément. Résistance chutes de 2 mètres.',
    descriptionEn: 'Crucial X9 Pro 1TB compact portable SSD with anodized aluminum body and 1050 MB/s read/write speed.',
    isBestSeller: false
  },
  {
    title: 'Clé USB Kingston DataTraveler Max 256GB Type-C 1000Mo/s',
    titleFr: 'Clé USB Kingston DataTraveler Max 256GB Type-C 1000Mo/s',
    titleEn: 'Kingston DataTraveler Max 256GB USB-C 1000MB/s Flash Drive',
    author: 'Kingston',
    category: 'Stockage',
    subCategory: 'Clés USB 3.2',
    price: 490,
    originalPrice: 590,
    costPrice: 360,
    stock: 35,
    image: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?auto=format&fit=crop&w=800&q=80',
    description: 'Performances dignes d’un SSD dans le format d’une clé USB : jusqu’à 1000 Mo/s en lecture via interface USB 3.2 Gen 2 Type-C.',
    descriptionFr: 'Kingston DataTraveler Max 256GB avec connecteur rétractable et LED témoin d’activité. Idéale pour PC et MacBook.',
    descriptionEn: 'Kingston DataTraveler Max 256GB USB-C flash drive achieving record-breaking 1000 MB/s transfer speeds.',
    isBestSeller: false
  },
  {
    title: 'Carte Mémoire SanDisk Extreme PRO MicroSDXC 256GB 200Mo/s',
    titleFr: 'Carte Mémoire SanDisk Extreme PRO MicroSDXC 256GB 200Mo/s',
    titleEn: 'SanDisk Extreme PRO 256GB MicroSDXC UHS-I Card 200MB/s',
    author: 'SanDisk',
    category: 'Stockage',
    subCategory: 'Cartes MicroSD',
    price: 380,
    originalPrice: 450,
    costPrice: 260,
    stock: 40,
    image: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=800&q=80',
    description: 'Vitesses jusqu’à 200 Mo/s avec SanDisk QuickFlow, classe V30 pour enregistrement vidéo fluide 4K UHD sur drones, GoPro et smartphones.',
    descriptionFr: 'SanDisk Extreme PRO MicroSD 256GB Classe A2 pour un chargement d’applications ultra-rapide. Adaptateur SD inclus.',
    descriptionEn: 'SanDisk Extreme PRO 256GB MicroSDXC card with V30 4K UHD video speed rating and A2 app performance.',
    isBestSeller: false
  },
  {
    title: 'Disque SSD Interne Samsung 990 PRO NVMe M.2 2TB PCIe 4.0',
    titleFr: 'Disque SSD Interne Samsung 990 PRO NVMe M.2 2TB PCIe 4.0',
    titleEn: 'Samsung 990 PRO 2TB PCIe 4.0 NVMe M.2 Internal SSD',
    author: 'Samsung',
    category: 'Stockage',
    subCategory: 'Disques SSD externes',
    price: 2390,
    originalPrice: 2690,
    costPrice: 1950,
    stock: 14,
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
    description: 'Le SSD NVMe PCIe 4.0 le plus rapide du monde : 7450 Mo/s en lecture, parfait pour booster votre PC Gamer ou votre PlayStation 5.',
    descriptionFr: 'Samsung 990 PRO 2TB avec contrôle thermique intelligent et dissipation avancée. Compatible PC fixe, portable et PS5.',
    descriptionEn: 'Samsung 990 PRO 2TB PCIe 4.0 NVMe internal SSD reaching up to 7450 MB/s sequential read speed.',
    isPromoted: true
  }
]

async function seed() {
  console.log('--- DEBUT DU SEEDING CATALOGUE TEKNO STORE ---')

  const seededBookIds: Record<string, string> = {}

  for (const p of PRODUCTS) {
    const existing = await prisma.book.findFirst({
      where: {
        OR: [
          { title: p.title },
          { titleFr: p.titleFr },
          { titleEn: p.titleEn }
        ]
      }
    })

    if (existing) {
      console.log(`[UPDATE] ${p.title} (${p.category} - ${p.author})`)
      const updated = await prisma.book.update({
        where: { id: existing.id },
        data: {
          title: p.title,
          titleFr: p.titleFr,
          titleEn: p.titleEn,
          author: p.author,
          category: p.category,
          subCategory: p.subCategory,
          price: p.price,
          originalPrice: p.originalPrice,
          costPrice: p.costPrice,
          stock: p.stock,
          image: p.image,
          description: p.description,
          descriptionFr: p.descriptionFr,
          descriptionEn: p.descriptionEn,
          isBestSeller: p.isBestSeller ?? false,
          isPromoted: p.isPromoted ?? false,
          active: true,
          status: 'APPROVED',
          condition: 'NEW',
          language: 'fr',
          imageAlt: `${p.title} Maroc`
        }
      })
      seededBookIds[p.title] = updated.id
    } else {
      console.log(`[INSERT] ${p.title} (${p.category} - ${p.author})`)
      const created = await prisma.book.create({
        data: {
          id: randomUUID(),
          title: p.title,
          titleFr: p.titleFr,
          titleEn: p.titleEn,
          author: p.author,
          category: p.category,
          subCategory: p.subCategory,
          price: p.price,
          originalPrice: p.originalPrice,
          costPrice: p.costPrice,
          stock: p.stock,
          image: p.image,
          description: p.description,
          descriptionFr: p.descriptionFr,
          descriptionEn: p.descriptionEn,
          isBestSeller: p.isBestSeller ?? false,
          isPromoted: p.isPromoted ?? false,
          active: true,
          status: 'APPROVED',
          condition: 'NEW',
          language: 'fr',
          imageAlt: `${p.title} Maroc`
        }
      })
      seededBookIds[p.title] = created.id
    }
  }

  console.log(`Produits synchronisés avec succès. Total: ${PRODUCTS.length}`)

  // ================= SEED DES PACKS =================
  console.log('\n--- SEED DES PACKS PROMOTIONNELS ---')

  const PACKS_DEF = [
    {
      name: 'Pack Apple Nomade Pro',
      nameFr: 'Pack Apple Nomade Pro',
      nameEn: 'Apple Nomad Pro Bundle',
      description: 'La combinaison nomade idéale : MacBook Air 13" M3 + AirPods Pro 2 USB-C + Hub USB-C Satechi 8-en-1.',
      descriptionFr: 'MacBook Air 13 pouces M3 + écouteurs AirPods Pro 2 MagSafe + adaptateur multiprise USB-C 8-en-1. Housse antichoc offerte.',
      descriptionEn: 'MacBook Air 13" M3 + AirPods Pro 2 + Satechi 8-in-1 USB-C Hub bundle.',
      price: 16990,
      originalPrice: 18170,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
      booksTitles: [
        'MacBook Air 13 pouces Puce M3 16GB RAM 512GB SSD Minuit',
        'AirPods Pro 2 avec Boîtier MagSafe USB-C',
        'Hub USB-C 8-en-1 Satechi Dual 4K HDMI + PD 100W'
      ]
    },
    {
      name: 'Pack Smartphone Power Ultimate',
      nameFr: 'Pack Smartphone Power Ultimate',
      nameEn: 'Smartphone Power Ultimate Bundle',
      description: 'L’équipement mobile ultime : iPhone 16 Pro Max 256GB + Chargeur Anker Prime 67W GaN + Chargeur Apple MagSafe 15W.',
      descriptionFr: 'iPhone 16 Pro Max 256GB Titane + Chargeur mural Anker Prime 67W 3 ports + Chargeur sans fil officiel Apple MagSafe.',
      descriptionEn: 'iPhone 16 Pro Max 256GB + Anker Prime 67W GaN Charger + Apple MagSafe 15W wireless charger.',
      price: 15790,
      originalPrice: 16970,
      image: '/book-placeholder.png',
      booksTitles: [
        'iPhone 16 Pro Max 256GB Titane Naturel',
        'Chargeur Rapide Anker Prime 67W GaN 3 Ports USB-C',
        'Chargeur Sans Fil Apple MagSafe Rapide 15W avec Câble Tressé'
      ]
    },
    {
      name: 'Pack Setup & Productivité Bureau',
      nameFr: 'Pack Setup & Productivité Bureau',
      nameEn: 'Office Setup & Productivity Bundle',
      description: 'Optimisez votre télétravail : Souris Logitech MX Master 3S + Clavier MX Keys S + SSD Samsung T7 Shield 1TB + Hub Satechi.',
      descriptionFr: 'Setup de travail ergonomique complet pour booster votre vitesse et confort au quotidien sur Mac ou PC.',
      descriptionEn: 'Complete ergonomic desk setup with Logitech MX Master 3S, MX Keys S, Samsung T7 SSD and USB-C Hub.',
      price: 3990,
      originalPrice: 4660,
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
      booksTitles: [
        'Souris Sans Fil Logitech MX Master 3S Graphite',
        'Clavier Sans Fil Logitech MX Keys S Rétroéclairé Graphite',
        'Disque SSD Externe Samsung T7 Shield 1TB USB 3.2',
        'Hub USB-C 8-en-1 Satechi Dual 4K HDMI + PD 100W'
      ]
    },
    {
      name: 'Pack Gamer Esport Nomade',
      nameFr: 'Pack Gamer Esport Nomade',
      nameEn: 'Esport Nomad Gaming Bundle',
      description: 'Prêt à performer partout : PC Gamer Lenovo Legion 5 Pro + Souris Logitech MX Master 3S + Casque Sony WH-1000XM5.',
      descriptionFr: 'Pack taillé pour les joueurs compétitifs et les créateurs de contenu en déplacement avec puissance graphique RTX 4060.',
      descriptionEn: 'High performance gaming bundle with Lenovo Legion 5 Pro, Logitech mouse and Sony ANC headphones.',
      price: 17990,
      originalPrice: 18870,
      image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
      booksTitles: [
        'Lenovo Legion 5 Pro (Ryzen 7 / RTX 4060 / 16GB / 512GB)',
        'Souris Sans Fil Logitech MX Master 3S Graphite',
        'Sony WH-1000XM5 Casque Bluetooth ANC Noir'
      ]
    }
  ]

  for (const pDef of PACKS_DEF) {
    let pack = await prisma.pack.findFirst({
      where: {
        OR: [
          { name: pDef.name },
          { nameFr: pDef.nameFr }
        ]
      }
    })

    if (!pack) {
      pack = await prisma.pack.create({
        data: {
          id: randomUUID(),
          name: pDef.name,
          nameFr: pDef.nameFr,
          nameEn: pDef.nameEn,
          description: pDef.description,
          descriptionFr: pDef.descriptionFr,
          descriptionEn: pDef.descriptionEn,
          price: pDef.price,
          originalPrice: pDef.originalPrice,
          image: pDef.image,
          active: true,
          isFreeDelivery: true,
          isPromoted: true
        }
      })
      console.log(`[PACK CRÉÉ] ${pDef.name}`)
    } else {
      await prisma.pack.update({
        where: { id: pack.id },
        data: {
          nameFr: pDef.nameFr,
          nameEn: pDef.nameEn,
          description: pDef.description,
          descriptionFr: pDef.descriptionFr,
          descriptionEn: pDef.descriptionEn,
          price: pDef.price,
          originalPrice: pDef.originalPrice,
          image: pDef.image,
          active: true,
          isFreeDelivery: true,
          isPromoted: true
        }
      })
      console.log(`[PACK MAJ] ${pDef.name}`)
    }

    // Lier les livres du pack
    for (const bTitle of pDef.booksTitles) {
      const bId = seededBookIds[bTitle]
      if (bId) {
        const linkExists = await prisma.packBook.findFirst({
          where: { packId: pack.id, bookId: bId }
        })
        if (!linkExists) {
          await prisma.packBook.create({
            data: {
              id: randomUUID(),
              packId: pack.id,
              bookId: bId
            }
          })
          console.log(`  -> Lié livre : ${bTitle}`)
        }
      }
    }
  }

  const finalBooksCount = await prisma.book.count({ where: { active: true } })
  const finalPacksCount = await prisma.pack.count({ where: { active: true } })
  console.log(`\n=== CATALOGUE COMPLET : ${finalBooksCount} PRODUITS & ${finalPacksCount} PACKS ACTIFS ===`)
}

seed()
  .catch((e) => {
    console.error('Erreur de seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
