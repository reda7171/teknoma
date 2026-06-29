const fs = require('fs');
const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');
const target = '  // Marketplace fields';
const replacement = '  // Tracking & Media Buying\n  utmSource      String?              @db.VarChar(100)\n  utmMedium      String?              @db.VarChar(100)\n  utmCampaign    String?              @db.VarChar(255)\n  fbclid         String?              @db.VarChar(255)\n  ttclid         String?              @db.VarChar(255)\n\n  // Marketplace fields';
if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Schema updated successfully');
} else {
    console.log('Target string not found');
}
