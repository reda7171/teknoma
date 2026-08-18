import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const comments = [
  {
    postId: '01ccf477-3f39-4cc3-b4bc-363f02300ba6', // 5 Raisons Pour Lesquelles Les Livres Papier
    authorName: 'سكينة',
    content: 'مقال واعر بزاف، صراحة ريحة الكتوب والورق مايمكنش يعوضها شي تليفون ولا كيندل. شكرا على هاد التحليل.',
    isApproved: true,
  },
  {
    postId: '01ccf477-3f39-4cc3-b4bc-363f02300ba6',
    authorName: 'أنس',
    content: 'متفق معاكم 100%، الكتاب الورقي كيبقى عندو واحد السحر خاص وخا التكنولوجيا طورت.',
    isApproved: true,
  },
  {
    postId: '026c5d0b-854a-4018-88fc-1225fe28efe6', // دوستويفسكي
    authorName: 'بدر',
    content: 'دوستويفسكي من أعظم الكتاب لي دازو فالتاريخ. هاد المقال لخص مزيان السيرة ديالو والأعمال ديالو الكبار. تبارك الله عليكم.',
    isApproved: true,
  },
  {
    postId: '026c5d0b-854a-4018-88fc-1225fe28efe6',
    authorName: 'أميمة',
    content: 'من ديما كيعجبني نقرا لدوستويفسكي، خصوصا الجريمة والعقاب. مقال ممتع وفيه معلومات مهمة وغيخليني نرجع نقرا كتوبو تاني.',
    isApproved: true,
  },
  {
    postId: '02dd2cde-7eec-439f-b9a0-217fd750b0bc', // عالم صوفي
    authorName: 'ياسين',
    content: 'عالم صوفي هو أحسن مدخل للفلسفة. قريتها شحال هادي وباقي عاقل عليها. تحليل زوين بزاف فهاد المقال.',
    isApproved: true,
  },
  {
    postId: '05552877-4174-4344-abb9-d3cc5ae72dbb', // La Boîte à Merveilles
    authorName: 'سلمى',
    content: 'رجعنا لأيام الباكالوريا هههه.. الصراحة الرواية كتعيشك فالأجواء الشعبية المغربية القديمة. مقال زوين ولخص بزاف الحوايج.',
    isApproved: true,
  },
  {
    postId: '05552877-4174-4344-abb9-d3cc5ae72dbb',
    authorName: 'إلياس',
    content: 'تحليل فالمستوى، كيعاون بزاف التلامذ ديال الباك باش يفهمو الرواية حسن.',
    isApproved: true,
  },
  {
    postId: '0614eedd-3d85-4a53-b8e0-587d5e3c1b4a', // أدهم شرقاوي
    authorName: 'أيوب',
    content: 'الأسلوب ديال أدهم شرقاوي كيخليك تقرا بلا ماتحس بالملل. مقال زوين كيعطي حقو لهاد الكاتب الرائع.',
    isApproved: true,
  },
];

async function main() {
    console.log('Inserting article comments...');
    for (const data of comments) {
        await prisma.comment.create({
            data,
        });
    }
    console.log('Done!');
}

main().finally(() => prisma.$disconnect());
