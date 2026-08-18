import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const reviews = [
  {
    bookId: '0199942d-3cec-4ad8-a8e2-cf471d7be496', // Ego is the Enemy
    fullName: 'أمين',
    city: 'الدار البيضاء',
    rating: 5,
    comment: 'كتاب واعر بزاف، كيعاونك تفهم بلي العدو الحقيقي ديالك هو الأنا ديالك. طريقة الكتابة ديال Ryan Holiday ساهلة وعميقة. كنصح بيه أي واحد باغي يطور راسو.',
    isApproved: true,
  },
  {
    bookId: '0199942d-3cec-4ad8-a8e2-cf471d7be496', // Ego is the Enemy
    fullName: 'سفيان',
    city: 'الرباط',
    rating: 4,
    comment: 'من أحسن الكتوب لي قريت هاد العام. كيعطيك أمثلة من التاريخ وكيفاش الغرور طيح ناس كبار. صراحة كتاب كيخليك تراجع بزاف ديال الحوايج.',
    isApproved: true,
  },
  {
    bookId: '0328fd29-98cc-47ec-9841-1c83577be3ba', // ملائك نصيبين
    fullName: 'خديجة',
    city: 'مراكش',
    rating: 5,
    comment: 'أحمد خالد مصطفى ديما كيبهرنا. رواية كتشدك من الصفحة الأولى وماكتقدرش تحطها حتى تساليها. خيال واسع ومعلومات تاريخية مكتوبة بطريقة مشوقة.',
    isApproved: true,
  },
  {
    bookId: '0328fd29-98cc-47ec-9841-1c83577be3ba', // ملائك نصيبين
    fullName: 'يوسف',
    city: 'أكادير',
    rating: 4,
    comment: 'القصة خطيرة ولكن كاين شي بلايص حسيت بلي تعقدات شوية. المهم رواية كتستاهل القراءة للي كيعجبو هاد النوع ديال الغموض والخيال.',
    isApproved: true,
  },
  {
    bookId: '038207d2-2aa2-4917-9fd2-e5a3f940f5eb', // The Power of Habit
    fullName: 'فاطمة الزهراء',
    city: 'طنجة',
    rating: 5,
    comment: 'كتاب زوين كيخليك تفهم كيفاش العادات ديالنا كتتكون وكيفاش نقدرو نبدلوها. عاوني بزاف باش نحيد شي عادات خايبين.',
    isApproved: true,
  },
  {
    bookId: '038207d2-2aa2-4917-9fd2-e5a3f940f5eb', // The Power of Habit
    fullName: 'المهدي',
    city: 'فاس',
    rating: 4,
    comment: 'فكرة الكتاب مزيانة، كيهضر على العادة كيفاش كتخدم (الإشارة، الروتين، المكافأة). طويل شوية ولكن فيه أمثلة زوينة وكيفهم مزيان.',
    isApproved: true,
  },
  {
    bookId: '0138f6bd-5231-489f-87fa-35bf3f2eb210', // الحرب والسلام 1/2
    fullName: 'هشام',
    city: 'سلا',
    rating: 5,
    comment: 'تحفة أدبية من عند تولستوي. الترجمة مزيانة والقصة كتدخلك فواحد العالم آخر ديال روسيا فعهد نابليون. ضروري خصو يكون فمكتبة كل قاري.',
    isApproved: true,
  },
  {
    bookId: '01fa66cc-6726-4489-87fa-500845e64d85', // قصاص
    fullName: 'نادية',
    city: 'وجدة',
    rating: 5,
    comment: 'قصة زوينة ومؤثرة بزاف. الكاتبة قدرات توصل المشاعر ديال الشخصيات بطريقة واعرة. بكيت فشي لقطات الصراحة.',
    isApproved: true,
  },
];

async function main() {
    console.log('Inserting reviews...');
    for (const data of reviews) {
        await prisma.review.create({
            data,
        });
    }
    console.log('Done!');
}

main().finally(() => prisma.$disconnect());
