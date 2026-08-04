const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const setting = await prisma.siteSettings.findUnique({ where: { key: 'seo_default_title' } });
  
  if (setting && setting.value !== 'Riwaya') {
    await prisma.siteSettings.update({
      where: { key: 'seo_default_title' },
      data: { value: 'Riwaya' }
    });
    console.log('Updated title to Riwaya');
  } else if (!setting) {
    await prisma.siteSettings.create({
      data: { key: 'seo_default_title', value: 'Riwaya' }
    });
    console.log('Created title Riwaya');
  } else {
    console.log('Already set to Riwaya');
  }
}

main().finally(() => prisma.$disconnect());
