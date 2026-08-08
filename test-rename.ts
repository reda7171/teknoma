import { prisma } from './src/lib/prisma';
async function run() {
    const book = await prisma.book.findFirst({ where: { image: { not: '' } } });
    console.log('Testing book:', book?.id);
    const res = await fetch('http://localhost:3000/api/admin/books/' + book?.id + '/rename-image', { method: 'POST' });
    console.log(res.status, await res.text());
}
run();
