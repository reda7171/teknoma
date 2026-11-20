import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { Shield, Mail, FileText, AlertTriangle, CheckCircle } from 'lucide-react'

export default async function DMCAPage({
    params,
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params;
    const isAr = locale === 'ar';
    const isEn = locale === 'en';

    const t = {
        title: isAr ? 'سياسة حقوق النشر (DMCA)' : isEn ? 'DMCA Policy' : 'Politique DMCA',
        introTitle: isAr ? '1. مقدمة' : isEn ? '1. Introduction' : '1. Introduction',
        introText: isAr
            ? 'في Tekno Store (Tekno Store)، نحن نحترم حقوق الملكية الفكرية للآخرين ونتوقع من مستخدمينا فعل الشيء نفسه. وفقًا لقانون الألفية للملكية الرقمية (DMCA)، سنستجيب بسرعة لإشعارات انتهاك حقوق الطبع والنشر التي يتم الإبلاغ عنها بشكل صحيح.'
            : isEn
            ? 'At Tekno Store, we respect the intellectual property rights of others and expect our users to do the same. In accordance with the Digital Millennium Copyright Act (DMCA), we will respond promptly to notices of alleged copyright infringement that are properly reported to us.'
            : 'Chez Tekno Store, nous respectons les droits de propriété intellectuelle d\'autrui et nous attendons de nos utilisateurs qu\'ils en fassent de même. Conformément au Digital Millennium Copyright Act (DMCA), nous répondrons rapidement aux avis de violation de droits d\'auteur qui nous sont dûment signalés.',
        reportTitle: isAr ? '2. الإبلاغ عن انتهاك' : isEn ? '2. Report an Infringement' : '2. Signaler une violation',
        reportIntro: isAr
            ? 'إذا كنت مالكًا لحقوق الطبع والنشر أو مفوضًا بالتصرف نيابة عن أحدهم، يمكنك الإبلاغ عن انتهاك مزعوم من خلال تقديم المعلومات التالية كتابةً:'
            : isEn
            ? 'If you are a copyright owner or authorized to act on behalf of one, you may report an alleged infringement by providing the following information in writing:'
            : 'Si vous êtes titulaire de droits d\'auteur ou autorisé à agir au nom de l\'un d\'eux, vous pouvez nous signaler une violation présumée en fournissant les informations suivantes par écrit :',
        reportItems: isAr
            ? [
                'وصف للعمل المحمي بحقوق الطبع والنشر الذي تعتقد أنه تم انتهاكه.',
                'وصف للمواد التي تعتقد أنها تنتهك الحقوق وموقعها على موقعنا (الرابط الدقيق).',
                'معلومات الاتصال بك: العنوان، ورقم الهاتف، وعنوان البريد الإلكتروني.',
                'بيان يؤكد أنك تعتقد بحسن نية أن استخدام المواد غير مصرح به من قبل مالك حقوق الطبع والنشر.',
                'بيان يؤكد أن المعلومات المقدمة دقيقة وأنك مفوض بالتصرف نيابة عن المالك.',
                'توقيعك الفعلي أو الإلكتروني.'
            ]
            : isEn
            ? [
                'A description of the copyrighted work that you claim has been infringed.',
                'A description of the material that you claim is infringing and its location on our site (exact URL).',
                'Your contact information: address, telephone number, and email address.',
                'A statement that you have a good faith belief that use of the material is not authorized by the copyright owner.',
                'A statement that the information provided is accurate, and that you are authorized to act on behalf of the owner.',
                'Your physical or electronic signature.'
            ]
            : [
                'Une description de l\'œuvre protégée par le droit d\'auteur qui, selon vous, a été enfreinte.',
                'Une description du matériel que vous jugez en infraction et son emplacement sur notre site (URL exacte).',
                'Vos coordonnées : adresse, numéro de téléphone et adresse e-mail.',
                'Une déclaration confirmant que vous croyez de bonne foi que l\'utilisation du matériel n\'est pas autorisée par le propriétaire des droits d\'auteur.',
                'Une déclaration confirmant que les informations fournies sont exactes et que vous êtes autorisé à agir au nom du propriétaire.',
                'Votre signature physique ou électronique.'
            ],
        counterTitle: isAr ? '3. إشعار مضاد' : isEn ? '3. Counter-Notification' : '3. Contre-notification',
        counterIntro: isAr
            ? 'إذا كنت تعتقد أن المحتوى الخاص بك قد تمت إزالته عن طريق الخطأ نتيجة لمطالبة DMCA، يمكنك تقديم إشعار مضاد يحتوي على:'
            : isEn
            ? 'If you believe your content was removed by mistake as a result of a DMCA claim, you can submit a counter-notification containing:'
            : 'Si vous pensez que votre contenu a été retiré par erreur suite à une réclamation DMCA, vous pouvez soumettre une contre-notification contenant :',
        counterItems: isAr
            ? [
                'تحديد المواد التي تمت إزالتها وموقعها السابق.',
                'بيان تحت طائلة عقوبة الحنث باليمين يفيد بأنك تعتقد بحسن نية أن المواد تمت إزالتها نتيجة لخطأ أو تحديد خاطئ.',
                'اسمك وعنوانك ورقم هاتفك.',
                'توقيعك الفعلي أو الإلكتروني.'
            ]
            : isEn
            ? [
                'Identification of the removed material and its previous location.',
                'A statement under penalty of perjury that you have a good faith belief that the material was removed as a result of a mistake or misidentification.',
                'Your name, address, and telephone number.',
                'Your physical or electronic signature.'
            ]
            : [
                'L\'identification du matériel retiré et son emplacement précédent.',
                'Une déclaration sous peine de parjure indiquant que vous croyez de bonne foi que le matériel a été retiré à la suite d\'une erreur ou d\'une mauvaise identification.',
                'Vos nom, adresse et numéro de téléphone.',
                'Votre signature physique ou électronique.'
            ],
        contactTitle: isAr ? '4. جهة اتصال DMCA' : isEn ? '4. DMCA Contact' : '4. Contact DMCA',
        contactIntro: isAr
            ? 'لأي إشعار بانتهاك حقوق الطبع والنشر أو إشعار مضاد، يرجى الاتصال بوكيل DMCA المعين لدينا على العنوان التالي:'
            : isEn
            ? 'For any copyright infringement notification or counter-notification, please contact our designated DMCA agent at the following address:'
            : 'Pour toute notification de violation de droits d\'auteur ou contre-notification, veuillez contacter notre agent DMCA désigné à l\'adresse suivante :'
    };

    return (
        <div className="min-h-screen bg-pixio-cream">
            <Header />
            <main className="max-w-4xl mx-auto px-4 py-24">
                <div className="bg-white rounded-[3rem] p-12 md:p-20 shadow-2xl shadow-black/5 border border-gray-100">
                    <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-10">
                        <Shield className="w-8 h-8" />
                    </div>

                    <h1 className={`text-3xl md:text-5xl font-black text-black tracking-tighter mb-12 ${!isAr && 'italic'}`}>
                        {t.title}<span className="text-gray-200">.</span>
                    </h1>

                    <div className="prose prose-lg max-w-none text-gray-500 font-bold uppercase tracking-tight text-xs space-y-12">
                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <AlertTriangle className="w-5 h-5" /> {t.introTitle}
                            </h2>
                            <p className={`leading-relaxed ${isAr ? 'text-sm' : ''}`}>
                                {t.introText}
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <FileText className="w-5 h-5" /> {t.reportTitle}
                            </h2>
                            <p className={`leading-relaxed ${isAr ? 'text-sm' : ''}`}>
                                {t.reportIntro}
                            </p>
                            <ul className={`list-disc ${isAr ? 'pr-6' : 'pl-6'} space-y-2 mt-4 text-[10px] ${isAr ? 'text-xs' : ''}`}>
                                {t.reportItems.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <CheckCircle className="w-5 h-5" /> {t.counterTitle}
                            </h2>
                            <p className={`leading-relaxed ${isAr ? 'text-sm' : ''}`}>
                                {t.counterIntro}
                            </p>
                            <ul className={`list-disc ${isAr ? 'pr-6' : 'pl-6'} space-y-2 mt-4 text-[10px] ${isAr ? 'text-xs' : ''}`}>
                                {t.counterItems.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <Mail className="w-5 h-5" /> {t.contactTitle}
                            </h2>
                            <p className={`leading-relaxed ${isAr ? 'text-sm' : ''}`}>
                                {t.contactIntro}
                            </p>
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-4">
                                <p className="text-black font-black flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Email:
                                    <a href="mailto:khedimatnet@gmail.com" className="text-blue-600 hover:underline lowercase normal-case">khedimatnet@gmail.com</a>
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
