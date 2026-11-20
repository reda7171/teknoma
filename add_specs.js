const fs = require('fs');

const updateNamespace = (file) => {
  let data = JSON.parse(fs.readFileSync(file, 'utf8'));

  data['AccessoryDetail']['Specs'] = {
    Material: file.includes('fr') ? 'Matériau / Matière' : file.includes('ar') ? 'المادة / المكونات' : 'Material',
    Dimensions: file.includes('fr') ? 'Dimensions' : file.includes('ar') ? 'الأبعاد' : 'Dimensions',
    WeightCapacity: file.includes('fr') ? 'Poids / Capacité' : file.includes('ar') ? 'الوزن / السعة' : 'Weight / Capacity',
    Warranty: file.includes('fr') ? 'Garantie' : file.includes('ar') ? 'الضمان' : 'Warranty',
    MaterialPremium: file.includes('fr') ? 'Matériaux premium' : file.includes('ar') ? 'مواد عالية الجودة' : 'Premium materials',
    BookmarkMaterial: file.includes('fr') ? 'Métal ciselé / Cuir' : file.includes('ar') ? 'معدن منقوش / جلد' : 'Carved metal / Leather',
    BookmarkDim: '12 x 3 cm',
    Standard: file.includes('fr') ? 'Standard' : file.includes('ar') ? 'قياسي' : 'Standard',
    USBCapacity: '64 Go',
    PetsUniversWarranty: file.includes('fr') ? 'Garantie qualité PetsUnivers' : file.includes('ar') ? 'ضمان جودة PetsUnivers' : 'PetsUnivers quality guarantee'
  };

  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

updateNamespace('src/messages/fr.json');
updateNamespace('src/messages/ar.json');
updateNamespace('src/messages/en.json');
