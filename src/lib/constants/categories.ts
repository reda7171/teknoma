export type CategoryTree = {
  [category: string]: string[];
};

export const CATEGORIES: CategoryTree = {
  "Littérature": [
    "Romans froncophones",
    "Romans étrangers traduits",
    "Polars",
    "SF & Fantasy",
    "Théâtre",
    "Littérature marocaine",
    "Poésie",
    "Livres en arabe"
  ],
  "English Fiction": [
    "Litterature in English",
    "Romantasy",
    "Thrillers & Horror",
    "Adult & Dark Romance",
    "Poetry",
    "Sci-Fi & Fantasy"
  ],
  "English Non-Fiction": [
    "Humanities",
    "Business",
    "Travel",
    "Self Help"
  ],
  "BD & Mangas": [
    "Mangas",
    "BD",
    "BD jeunesse",
    "Comics & Graphic Novels in English"
  ],
  "Jeunesse": [
    "Eveil",
    "3-6 ans",
    "6-9 ans",
    "9-12 ans",
    "Young adult",
    "Documentaires jeunesse",
    "Activités enfant",
    "0-3 Years Old",
    "3-6 Years Old",
    "6-9 Years Old",
    "9-12 Years Old",
    "Livres marocains pour enfants",
    "Livres en arabe pour enfant"
  ],
  "Arts et sciences humaines": [
    "Musique",
    "Sciences humaines",
    "Arts & culture",
    "Histoire",
    "Cinéma & Photographie",
    "Beaux livres"
  ],
  "Vie pratique": [
    "Santé & Bien-être",
    "Spiritualité",
    "Développement personel",
    "Cuisine & Cookbooks",
    "Loisirs, voyage et sport",
    "Nature & Animaux"
  ],
  "Scolaire et Pédagogie": [
    "Parascolaire",
    "Activités Montessori",
    "Scolaire",
    "Méthodes de langue"
  ],
  "Ecole Charcot": [

    "Livres en stock",
    "Papeterie"
  ]
};

export const MAIN_CATEGORIES = Object.keys(CATEGORIES);
