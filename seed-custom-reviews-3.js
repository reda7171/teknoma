const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const customReviews = [
  {
    titleSnippet: "نامت الأعين",
    fullName: "Aicha B.",
    rating: 5,
    comment: "PetsUnivers d thriller wa3ra, Maryam Al Haysi kat3rf tched lqari mn lbedya htal lkher.",
    city: "Rabat"
  },
  {
    titleSnippet: "افول الغرب",
    fullName: "Kamal T.",
    rating: 5,
    comment: "Une analyse géopolitique magistrale d'Hassan Aourid. Il décortique avec brio les signes de déclin de la civilisation occidentale.",
    city: "Casablanca"
  },
  {
    titleSnippet: "مذلون مهانون",
    fullName: "Ali S.",
    rating: 4,
    comment: "Dostoevsky masterfully portrays the suffering of the lower classes and the complexities of human pride and humiliation.",
    city: "Tanger"
  },
  {
    titleSnippet: "ربيهم بآية",
    fullName: "Khadija M.",
    rating: 5,
    comment: "Ktab zwin bzaf l ay oum wla ab baghi yrebi wladou 3la lqiyam l'islamiya b tariqa mbsta w sahla.",
    city: "Fes"
  },
  {
    titleSnippet: "الحياة ليست رجلا",
    fullName: "Salma Y.",
    rating: 5,
    comment: "Livre très inspirant pour l'indépendance émotionnelle des femmes. Il remet en question beaucoup de stéréotypes toxiques de notre société.",
    city: "Agadir"
  },
  {
    titleSnippet: "The Housemaid",
    fullName: "Yasmine",
    rating: 5,
    comment: "This thriller had me hooked from page one! The dynamic between Millie and Nina is so intense, and the twist is mind-blowing.",
    city: "Marrakech"
  },
  {
    titleSnippet: "ابق قويا",
    fullName: "Imane",
    rating: 4,
    comment: "Ktab fih afkar ijabiya l kola nhar. Demi Lovato chartkat tajarib dyalha w 3tat nassa2ih zwina bzaf.",
    city: "Oujda"
  },
  {
    titleSnippet: "الفقراء",
    fullName: "Othmane",
    rating: 5,
    comment: "Le premier roman de Dostoïevski et déjà un chef-d'œuvre. L'échange épistolaire est déchirant d'humanité et de réalisme.",
    city: "Casablanca"
  },
  {
    titleSnippet: "نبي أرض الشمال",
    fullName: "Hassan B.",
    rating: 5,
    comment: "A beautifully written historical fiction. The narrative depth and the philosophical undertones make it a truly immersive experience.",
    city: "Rabat"
  },
  {
    titleSnippet: "العوسج",
    fullName: "Nour",
    rating: 4,
    comment: "PetsUnivers mli2a b lghoumoud. Al Johara Al Ramal nj7at tkhl9 wahed ljew suspense makaykhelikch t7et lktab.",
    city: "Tanger"
  },
  {
    titleSnippet: "مذكرات من البيت الميت",
    fullName: "Tarik",
    rating: 5,
    comment: "Une plongée poignante dans les goulags sibériens. L'observation minutieuse de la psychologie des prisonniers est exceptionnelle.",
    city: "Meknes"
  },
  {
    titleSnippet: "THINKING BIG",
    fullName: "Saad",
    rating: 5,
    comment: "If you want to achieve more, you must think bigger. David Schwartz provides practical techniques to upgrade your mindset and overcome self-doubt.",
    city: "Casablanca"
  },
  {
    titleSnippet: "العبرات",
    fullName: "Houda",
    rating: 4,
    comment: "Sloub dyal lmanfalouti f lktaba makaynch bhalou. 9issass kat9iss lqelb w katkhlik tfker f dorouf dyal nass.",
    city: "Fes"
  },
  {
    titleSnippet: "تانجل",
    fullName: "Ayoub",
    rating: 4,
    comment: "Une série très addictive ! L'univers de Tangle est bien construit et les personnages sont pleins de surprises.",
    city: "Rabat"
  },
  {
    titleSnippet: "فاتتني صلاة",
    fullName: "Yassine D.",
    rating: 5,
    comment: "This book completely transformed my relationship with prayer. Islam Jamal writes in a way that deeply touches the heart and soul.",
    city: "Agadir"
  },
  {
    titleSnippet: "تأثير المركب",
    fullName: "Anas",
    rating: 5,
    comment: "Ktab darouri tqrah ila baghi tbdel hyatk. Kaywrik kifach af3al sghira yawmiya katjib nata2ij kbira f lmostqbal.",
    city: "Casablanca"
  },
  {
    titleSnippet: "المسخ",
    fullName: "Walid",
    rating: 5,
    comment: "Kafka's exploration of alienation and existential dread is perfectly captured in Gregor Samsa's transformation. A hauntingly brilliant novella.",
    city: "Marrakech"
  },
  {
    titleSnippet: "Rich Dad",
    fullName: "Mehdi Alaoui",
    rating: 5,
    comment: "Le livre indispensable pour comprendre l'éducation financière. Les concepts d'actifs et de passifs sont expliqués avec une clarté remarquable.",
    city: "Rabat"
  },
  {
    titleSnippet: "سقراط",
    fullName: "Mounir",
    rating: 4,
    comment: "Ibrahim El Zeiny brings the philosophy of Socrates to life. An excellent and accessible introduction to one of history's greatest thinkers.",
    city: "Tanger"
  },
  {
    titleSnippet: "لا تكن لطيفاً",
    fullName: "Nawal",
    rating: 4,
    comment: "Ktab kaywrik kifach tgoul LLA w ddafe3 3la rassek bla mat7es b ddenb. Bzaf del m3loumat mouhima fih.",
    city: "Oujda"
  }
];

async function main() {
  const books = await prisma.book.findMany({
    select: { id: true, title: true }
  });

  const reviewsToInsert = [];

  for (const review of customReviews) {
    const book = books.find(b => b.title.toLowerCase().includes(review.titleSnippet.toLowerCase()));
    if (book) {
      reviewsToInsert.push({
        bookId: book.id,
        fullName: review.fullName,
        rating: review.rating,
        comment: review.comment,
        isApproved: false,
        city: review.city
      });
    } else {
      console.log(`Livre non trouvé pour: ${review.titleSnippet}`);
    }
  }

  if (reviewsToInsert.length > 0) {
    await prisma.review.createMany({
      data: reviewsToInsert
    });
    console.log(`${reviewsToInsert.length} nouveaux avis sur mesure insérés avec succès !`);
  } else {
    console.log("Aucun livre correspondant trouvé.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
