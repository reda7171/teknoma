const fs = require('fs');
const path = require('path');

const langs = ['ar', 'en', 'fr'];
langs.forEach(lang => {
  const filePath = path.join(__dirname, 'src', 'messages', `${lang}.json`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (lang === 'ar') {
    content = content.replace(/أمين رغيب/g, "فريق رواية");
    content = content.replace(/مدونة المحترف/g, "رواية");
  } else {
    content = content.replace(/Amine Raghib/g, "Riwaya team");
    content = content.replace(/Al-Mohtarif/g, "Riwaya");
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${lang}.json`);
});
