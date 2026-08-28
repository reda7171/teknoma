const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const post = await prisma.post.findFirst({
        where: { slug: 'ahmed-khaled-mostafa-antichristos-secrets' },
        select: { coverImage: true, content: true }
    });
    if (!post) {
        console.log('Post not found');
        return;
    }
    const images = [post.coverImage];
    const regex = /<img[^>]+src=["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(post.content)) !== null) {
        images.push(match[1]);
    }
    const mdImages = /!\[.*?\]\((.*?)\)/g;
    while ((match = mdImages.exec(post.content)) !== null) {
        images.push(match[1]);
    }
    console.log(JSON.stringify(images.filter(Boolean), null, 2));
}
main();
