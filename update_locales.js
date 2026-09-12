const fs = require('fs');

const addNamespace = (file) => {
  let data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data['AccessoryDetail'] = {
    BackToCatalog: file.includes('fr') ? 'Retour au catalogue' : file.includes('ar') ? 'العودة إلى الكتالوج' : 'Back to catalog',
    FastDelivery: file.includes('fr') ? 'Livraison 24/48h' : file.includes('ar') ? 'توصيل 24/48 ساعة' : '24/48h Delivery',
    CODPayment: file.includes('fr') ? 'Paiement COD' : file.includes('ar') ? 'الدفع عند الاستلام' : 'COD Payment',
    QualityGuarantee: file.includes('fr') ? 'Garantie Qualité' : file.includes('ar') ? 'ضمان الجودة' : 'Quality Guarantee',
    ExcellentRating: file.includes('fr') ? '(Excellente appréciation)' : file.includes('ar') ? '(تقييم ممتاز)' : '(Excellent rating)',
    ProductPresentation: file.includes('fr') ? 'Présentation du produit' : file.includes('ar') ? 'تقديم المنتج' : 'Product presentation',
    SpecsAndDimensions: file.includes('fr') ? 'Fiche technique & Dimensions' : file.includes('ar') ? 'المواصفات الفنية والأبعاد' : 'Specs & Dimensions',
    Availability: file.includes('fr') ? 'Disponibilité' : file.includes('ar') ? 'التوفر' : 'Availability',
    InStock: file.includes('fr') ? "En stock (Prêt à l'envoi)" : file.includes('ar') ? 'متوفر (جاهز للإرسال)' : 'In stock (Ready to ship)',
    OnOrder: file.includes('fr') ? 'Sur commande' : file.includes('ar') ? 'عند الطلب' : 'On order',
    DeliveryAndService: file.includes('fr') ? 'Livraison & Garantie Maroc' : file.includes('ar') ? 'التوصيل والضمان بالمغرب' : 'Delivery & Warranty Morocco',
    CODTitle: file.includes('fr') ? 'Paiement à la Livraison (COD) :' : file.includes('ar') ? 'الدفع عند الاستلام :' : 'Cash on Delivery:',
    CODDesc: file.includes('fr') ? 'Commandez en toute sécurité. Vous inspectez votre produit à l\'arrivée et réglez le montant exact en espèces auprès de notre livreur partenaire.' : file.includes('ar') ? 'اطلب بأمان. يمكنك فحص منتجك عند الوصول ودفع المبلغ نقدًا لموزعنا.' : 'Order securely. Inspect your product on arrival and pay the exact amount in cash.',
    SpeedTitle: file.includes('fr') ? 'Délais rapides :' : file.includes('ar') ? 'مواعيد سريعة :' : 'Fast processing:',
    SpeedDesc: file.includes('fr') ? 'Nous expédions dans toutes les grandes villes du Maroc en 24h à 48h. Pour les autres régions, comptez 72h maximum.' : file.includes('ar') ? 'نقوم بالشحن لجميع المدن الكبرى بالمغرب في 24-48 ساعة. للمناطق الأخرى، 72 ساعة كحد أقصى.' : 'We ship to all major cities in Morocco in 24-48h. Other regions take up to 72h.',
    GuaranteeTitle: file.includes('fr') ? 'Garantie :' : file.includes('ar') ? 'الضمان :' : 'Guarantee:',
    GuaranteeDesc: file.includes('fr') ? 'Si l\'article ne correspond pas à la description ou présente un défaut, Riwaya s\'engage à vous le remplacer ou vous rembourser.' : file.includes('ar') ? 'إذا كان المنتج لا يتطابق مع الوصف أو به عيب، تلتزم رواية باستبداله أو إرجاع أموالك.' : 'If the item is defective or doesn\'t match, Riwaya will replace or refund it.',
    YouMightAlsoLike: file.includes('fr') ? 'Vous aimerez aussi...' : file.includes('ar') ? 'قد يعجبك أيضًا...' : 'You might also like...',
    StockLeft: file.includes('fr') ? 'Reste {stock}' : file.includes('ar') ? 'بقي {stock}' : '{stock} left',
    OutOfStock: file.includes('fr') ? 'Rupture de stock' : file.includes('ar') ? 'نفذت الكمية' : 'Out of stock',
    Currency: file.includes('fr') ? 'DH' : file.includes('ar') ? 'درهم' : 'MAD'
  };
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

addNamespace('src/messages/fr.json');
addNamespace('src/messages/ar.json');
addNamespace('src/messages/en.json');
