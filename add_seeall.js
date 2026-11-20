const fs = require('fs');

const updateNamespace = (file) => {
  let data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data['AccessoryDetail']['SeeAll'] = file.includes('fr') ? 'Tout voir' : file.includes('ar') ? 'عرض الكل' : 'See all';
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

updateNamespace('src/messages/fr.json');
updateNamespace('src/messages/ar.json');
updateNamespace('src/messages/en.json');
