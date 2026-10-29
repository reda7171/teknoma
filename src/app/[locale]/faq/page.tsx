import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import Script from 'next/script'
import { HelpCircle, Truck, CreditCard, RotateCcw, ShieldCheck, ChevronDown, BookOpen, Users, Package } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params

    const titles: Record<string, string> = {
        fr: 'FAQ — Vos Questions sur PetsUnivers | Livraison, Paiement, Retours',
        ar: 'الأسئلة الشائعة — PetsUnivers | التوصيل، الدفع، الإرجاع',
        en: 'FAQ — Your Questions about PetsUnivers | Delivery, Payment, Returns',
    }
    const descriptions: Record<string, string> = {
        fr: 'Toutes les réponses à vos questions sur la librairie PetsUnivers : délais de livraison au Maroc, paiement à la livraison (COD), retours et échanges de livres, disponibilité des stocks.',
        ar: 'إجابات على جميع أسئلتكم حول مكتبة PetsUnivers: مواعيد التوصيل في المغرب، الدفع عند الاستلام، إرجاع وتبادل الكتب، وتوفر المخزون.',
        en: 'All answers to your questions about PetsUnivers bookstore: delivery times in Morocco, cash on delivery (COD), book returns and exchanges, stock availability.',
    }

    return {
        title: titles[locale] || titles.fr,
        description: descriptions[locale] || descriptions.fr,
        alternates: {
            canonical: `https://petsunivers.ma/${locale}/faq`,
            languages: {
                'fr': 'https://petsunivers.ma/fr/faq',
                'ar': 'https://petsunivers.ma/ar/faq',
                'en': 'https://petsunivers.ma/en/faq',
            }
        }
    }
}

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations('FAQ');

    // Questions multilingues couvrant toutes les intentions de recherche AEO
    const faqSections = [
        {
            title: locale === 'ar' ? 'التوصيل والشحن' : locale === 'en' ? 'Delivery & Shipping' : 'Livraison & Expédition',
            icon: Truck,
            questions: [
                {
                    q: locale === 'ar' ? 'ما هي مواعيد التوصيل؟' : locale === 'en' ? 'What are the delivery times?' : 'Quels sont les délais de livraison ?',
                    a: locale === 'ar' ? 'للدار البيضاء والمناطق المجاورة، يتم التوصيل خلال 24 إلى 48 ساعة. لسائر مدن المغرب، يستغرق التوصيل من يومين إلى أربعة أيام عمل.' : locale === 'en' ? 'For Casablanca and surrounding areas, delivery takes 24 to 48 hours. For other cities in Morocco, expect 2 to 4 business days.' : "Pour Casablanca et environs, la livraison s'effectue en 24h à 48h. Pour les autres villes du Maroc, comptez entre 2 et 4 jours ouvrables."
                },
                {
                    q: locale === 'ar' ? 'هل يمكنني تتبع طردي؟' : locale === 'en' ? 'Can I track my package?' : 'Puis-je suivre mon colis ?',
                    a: locale === 'ar' ? 'نعم، بمجرد شحن طلبك ستتلقى رقم تتبع عبر الرسائل القصيرة أو البريد الإلكتروني. يمكنك أيضًا مراجعة صفحة "تتبع طلبي" على موقعنا.' : locale === 'en' ? "Yes, once your order is shipped, you will receive a tracking number via SMS or email. You can also check the 'Track my order' page on our site." : "Oui, dès l'expédition de votre commande, vous recevrez un numéro de suivi par SMS ou Email. Vous pouvez également consulter la page 'Suivre ma commande' sur notre site."
                },
                {
                    q: locale === 'ar' ? 'ما هي تكاليف التوصيل؟' : locale === 'en' ? 'What are the delivery costs?' : 'Quels sont les frais de livraison ?',
                    a: locale === 'ar' ? 'التوصيل بـ 25 درهم للدار البيضاء و35 درهمًا لسائر المدن. مجاني لكل طلب يتجاوز 300 درهم.' : locale === 'en' ? 'Delivery costs 25 درهم for Casablanca and 35 درهم for other cities. Free for any order over 300 درهم.' : 'La livraison est de 25 درهم pour Casablanca et 35 درهم pour les autres villes. Elle est offerte pour toute commande supérieure à 300 درهم.'
                },
                {
                    q: locale === 'ar' ? 'هل تقومون بالتوصيل إلى جميع مدن المغرب؟' : locale === 'en' ? 'Do you deliver to all cities in Morocco?' : 'Livrez-vous dans toutes les villes du Maroc ?',
                    a: locale === 'ar' ? 'نعم، نوصل إلى جميع مدن ومناطق المغرب، من طنجة إلى العيون، ومن الرشيدية إلى الداخلة.' : locale === 'en' ? 'Yes, we deliver to all cities and regions in Morocco, from Tangier to Laayoune, from Errachidia to Dakhla.' : "Oui, nous livrons dans toutes les villes et régions du Maroc, de Tanger à Laâyoune, de Errachidia à Dakhla."
                }
            ]
        },
        {
            title: locale === 'ar' ? 'الدفع والأمان' : locale === 'en' ? 'Payment & Security' : 'Paiement & Sécurité',
            icon: CreditCard,
            questions: [
                {
                    q: locale === 'ar' ? 'ما طرق الدفع التي تقبلونها؟' : locale === 'en' ? 'What payment methods do you accept?' : 'Quels modes de paiement acceptez-vous ?',
                    a: locale === 'ar' ? 'نعتمد الدفع عند الاستلام (COD) لضمان أمانكم. تدفعون مباشرة للمندوب عند استلام الطرد.' : locale === 'en' ? 'We prioritize Cash on Delivery (COD) for your security. You pay the delivery person directly when you receive your package.' : "Nous privilégions le paiement à la livraison (Cash on Delivery) pour votre sécurité. Vous payez directement le livreur au moment de la réception de votre colis."
                },
                {
                    q: locale === 'ar' ? 'هل الدفع عند الاستلام آمن؟' : locale === 'en' ? 'Is cash on delivery safe?' : 'Le paiement à la livraison est-il sécurisé ?',
                    a: locale === 'ar' ? 'نعم، بالدفع عند الاستلام لا تتحملون أي مخاطرة. تتفقدون طردكم قبل الدفع.' : locale === 'en' ? 'Yes, by paying on delivery you take no risk. You inspect your package before paying the amount due.' : "Oui, en payant à la livraison, vous ne prenez aucun risque. Vous vérifiez votre colis avant de régler le montant dû."
                },
                {
                    q: locale === 'ar' ? 'هل يمكنني إلغاء طلبي بعد تأكيده؟' : locale === 'en' ? 'Can I cancel my order after confirmation?' : 'Puis-je annuler ma commande après confirmation ?',
                    a: locale === 'ar' ? 'يمكن إلغاء الطلب قبل شحنه عن طريق التواصل معنا عبر واتساب. بعد الشحن، يصبح الإلغاء غير ممكن.' : locale === 'en' ? 'You can cancel your order before it is shipped by contacting us via WhatsApp. After shipping, cancellation is no longer possible.' : "Vous pouvez annuler votre commande avant son expédition en nous contactant via WhatsApp. Après expédition, l'annulation n'est plus possible."
                }
            ]
        },
        {
            title: locale === 'ar' ? 'الإرجاع والتبادل' : locale === 'en' ? 'Returns & Exchanges' : 'Retours & Échanges',
            icon: RotateCcw,
            questions: [
                {
                    q: locale === 'ar' ? 'هل يمكنني إرجاع كتاب؟' : locale === 'en' ? 'Can I return a book?' : 'Puis-je retourner un livre ?',
                    a: locale === 'ar' ? 'بالتأكيد. لديكم 3 أيام بعد الاستلام لطلب الإرجاع إذا كان الكتاب لا يتطابق مع توقعاتكم أو يحتوي على عيب.' : locale === 'en' ? 'Absolutely. You have 3 calendar days after receipt to request a return if the book does not match your expectations or has a defect.' : "Absolument. Vous disposez de 3 jours calendaires après réception pour demander un retour si le livre ne correspond pas à vos attentes ou s'il présente un défaut."
                },
                {
                    q: locale === 'ar' ? 'كيف يتم الاسترداد؟' : locale === 'en' ? 'How is the refund processed?' : 'Comment s\'effectue le remboursement ?',
                    a: locale === 'ar' ? 'بعد التحقق من حالة الكتاب المُرجَع، نتولى الاسترداد عبر تحويل بنكي أو قسيمة شراء قابلة للاستخدام فورًا على الموقع.' : locale === 'en' ? "After verifying the condition of the returned book, we process the refund via bank transfer or a purchase voucher immediately usable on the site." : "Après vérification de l'état du livre retourné, nous procédons au remboursement via virement bancaire ou par un bon d'achat utilisable immédiatement sur le site."
                }
            ]
        },
        {
            title: locale === 'ar' ? 'الكتب والمخزون' : locale === 'en' ? 'Books & Stock' : 'Livres & Stock',
            icon: BookOpen,
            questions: [
                {
                    q: locale === 'ar' ? 'كيف أتحقق من توفر كتاب؟' : locale === 'en' ? 'How do I check if a book is available?' : 'Comment vérifier si un livre est disponible ?',
                    a: locale === 'ar' ? 'يُعرض مستوى المخزون على صفحة كل كتاب. إذا ظهرت "متوفر"، يمكنكم الطلب فورًا.' : locale === 'en' ? 'Stock level is displayed on each book page. If it shows "In stock", you can order immediately.' : "Le niveau de stock est affiché sur la page de chaque livre. Si la mention 'En stock' apparaît, vous pouvez commander immédiatement."
                },
                {
                    q: locale === 'ar' ? 'هل تتوفرون على الكتب بالعربية والفرنسية والإنجليزية؟' : locale === 'en' ? 'Do you have books in Arabic, French and English?' : 'Avez-vous des livres en arabe, français et anglais ?',
                    a: locale === 'ar' ? 'نعم، كتالوجنا يضم كتبًا باللغات الثلاث: العربية والفرنسية والإنجليزية، في مجالات التطوير الذاتي، والروايات، والأعمال، والفلسفة.' : locale === 'en' ? 'Yes, our catalog includes books in all three languages: Arabic, French and English, in the fields of personal development, novels, business, and philosophy.' : "Oui, notre catalogue comprend des livres dans les trois langues : arabe, français et anglais, dans les domaines du développement personnel, romans, business, et philosophie."
                },
                {
                    q: locale === 'ar' ? 'هل يمكنني طلب كتاب غير موجود في الكتالوج؟' : locale === 'en' ? 'Can I order a book not in the catalog?' : 'Puis-je commander un livre absent du catalogue ?',
                    a: locale === 'ar' ? 'يمكنكم التواصل معنا عبر واتساب أو البريد الإلكتروني لطلب كتاب معين. سنبذل قصارى جهدنا لتوفيره لكم.' : locale === 'en' ? 'You can contact us via WhatsApp or email to request a specific book. We will do our best to source it for you.' : "Vous pouvez nous contacter via WhatsApp ou email pour demander un livre précis. Nous ferons notre maximum pour vous le trouver."
                }
            ]
        },
        {
            title: locale === 'ar' ? 'الباقات والعروض' : locale === 'en' ? 'Packs & Offers' : 'Packs & Offres',
            icon: Package,
            questions: [
                {
                    q: locale === 'ar' ? 'ما هي باقات الكتب؟' : locale === 'en' ? 'What are book packs?' : 'Que sont les packs de livres ?',
                    a: locale === 'ar' ? 'الباقات هي مجموعات من الكتب المختارة بعناية حول موضوع أو هدف محدد، بسعر خاص أقل من شراء الكتب منفردة.' : locale === 'en' ? 'Packs are curated sets of books around a specific theme or goal, at a special price lower than buying the books individually.' : "Les packs sont des ensembles de livres soigneusement sélectionnés autour d'un thème ou objectif précis, à un prix spécial inférieur à l'achat individuel."
                },
                {
                    q: locale === 'ar' ? 'هل الباقات بسعر أرخص من الكتب المفردة؟' : locale === 'en' ? 'Are packs cheaper than individual books?' : 'Les packs sont-ils moins chers que les livres individuels ?',
                    a: locale === 'ar' ? 'نعم، تتمتع باقاتنا بتخفيض يتراوح بين 10% و30% مقارنة بشراء كل كتاب على حدة.' : locale === 'en' ? 'Yes, our packs offer a discount of 10% to 30% compared to buying each book separately.' : "Oui, nos packs bénéficient d'une réduction de 10% à 30% par rapport à l'achat de chaque livre séparément."
                }
            ]
        },
        {
            title: locale === 'ar' ? 'عن PetsUnivers' : locale === 'en' ? 'About PetsUnivers' : 'À propos de PetsUnivers',
            icon: Users,
            questions: [
                {
                    q: locale === 'ar' ? 'ما هي مكتبة PetsUnivers؟' : locale === 'en' ? 'What is PetsUnivers bookstore?' : "Qu'est-ce que la librairie PetsUnivers ?",
                    a: locale === 'ar' ? 'PetsUnivers هي أحسن مكتبة إلكترونية في المغرب. نقدم أكبر مجموعة من روايات التطوير الذاتي والأعمال والفلسفة، مع توصيل سريع في جميع أنحاء المغرب والدفع عند الاستلام.' : locale === 'en' ? "PetsUnivers is Morocco's best online bookstore. We offer the largest selection of personal development, business, and philosophy books, with fast delivery across Morocco and cash on delivery payment." : "PetsUnivers est la meilleure librairie en ligne au Maroc. Nous offrons la plus grande sélection de livres de développement personnel, business et philosophie, avec une livraison rapide partout au Maroc et le paiement à la livraison."
                },
                {
                    q: locale === 'ar' ? 'أين يقع مقر مكتبة PetsUnivers؟' : locale === 'en' ? 'Where is PetsUnivers bookstore located?' : 'Où est située la librairie PetsUnivers ?',
                    a: locale === 'ar' ? 'يقع مقرنا في الرباط، المغرب. نوصل إلى جميع مدن المغرب.' : locale === 'en' ? 'Our headquarters is located in Rabat, Morocco. We deliver to all cities in Morocco.' : "Notre siège est situé à Rabat, Maroc. Nous livrons dans toutes les villes du Maroc."
                },
                {
                    q: locale === 'ar' ? 'كيف أتواصل مع مكتبة PetsUnivers؟' : locale === 'en' ? 'How do I contact PetsUnivers bookstore?' : 'Comment contacter la librairie PetsUnivers ?',
                    a: locale === 'ar' ? 'يمكنكم التواصل معنا عبر واتساب، أو البريد الإلكتروني، أو صفحاتنا على الشبكات الاجتماعية. نحن متاحون 7 أيام في الأسبوع.' : locale === 'en' ? 'You can contact us via WhatsApp, email, or our social media pages. We are available 7 days a week.' : "Vous pouvez nous contacter via WhatsApp, email, ou nos pages sur les réseaux sociaux. Nous sommes disponibles 7j/7."
                }
            ]
        }
    ];

    // Schema FAQPage complet pour AEO
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        // Speakable : les titres de section et questions sont lisibles par assistant vocal
        'speakable': {
            '@type': 'SpeakableSpecification',
            'cssSelector': ['h1', 'h2', 'h3', '.faq-answer']
        },
        mainEntity: faqSections.flatMap(section =>
            section.questions.map(q => ({
                '@type': 'Question',
                name: q.q,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: q.a
                }
            }))
        )
    };

    return (
        <div className="min-h-screen bg-white">
            <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <Header />

            {/* Hero Section */}
            <div className="pt-32 pb-20 bg-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-pixio-yellow/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-white rounded-full text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border border-gray-100 mb-8">
                        <HelpCircle className="w-4 h-4 text-pixio-yellow" />
                        <span>
                            {locale === 'ar' ? 'مركز المساعدة' : locale === 'en' ? 'Help Center' : "Centre d'aide"}
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-black tracking-tighter mb-6">
                        {locale === 'ar'
                            ? <><span className="text-pixio-yellow italic">الأسئلة</span> الشائعة.</>
                            : locale === 'en'
                                ? <>Frequently Asked <span className="text-pixio-yellow italic">Questions.</span></>
                                : <>Questions <span className="text-pixio-yellow italic">Fréquentes.</span></>
                        }
                    </h1>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg font-medium">
                        {locale === 'ar'
                            ? 'كل ما تحتاجون معرفته للطلب باطمئنان من مكتبة PetsUnivers.'
                            : locale === 'en'
                                ? 'Everything you need to know to order with peace of mind from PetsUnivers.'
                                : 'Tout ce que vous devez savoir pour commander en toute sérénité sur PetsUnivers.'
                        }
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="space-y-16">
                    {faqSections.map((section, idx) => (
                        <section key={idx}>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                                    <section.icon className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-black text-black uppercase tracking-tight">{section.title}</h2>
                            </div>

                            <div className="space-y-4">
                                {section.questions.map((faq, fIdx) => (
                                    <div key={fIdx} className="group bg-gray-50 rounded-[2rem] p-8 border border-transparent hover:border-gray-200 hover:bg-white transition-all cursor-pointer">
                                        <div className="flex justify-between items-start gap-4">
                                            <h3 className="text-lg font-black text-black leading-tight">{faq.q}</h3>
                                            <ChevronDown className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                                        </div>
                                        <p className="faq-answer mt-4 text-gray-500 font-medium leading-relaxed">
                                            {faq.a}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Still have questions? */}
                <div className="mt-24 bg-black text-white p-12 rounded-[3rem] text-center relative overflow-hidden">
                    <ShieldCheck className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 -rotate-12" />
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black mb-4 tracking-tight uppercase">
                            {locale === 'ar' ? 'لديك سؤال آخر؟' : locale === 'en' ? 'Still have a question?' : 'Encore une question ?'}
                        </h2>
                        <p className="text-gray-400 font-medium mb-8 max-w-lg mx-auto">
                            {locale === 'ar'
                                ? 'دعمنا عبر واتساب متاح 7 أيام في الأسبوع لمساعدتكم في اختياراتكم أو تتبع طلباتكم.'
                                : locale === 'en'
                                    ? 'Our WhatsApp support is available 7 days a week to help you with your choices or order tracking.'
                                    : 'Notre support WhatsApp est disponible 7j/7 pour vous aider dans vos choix ou le suivi de vos commandes.'
                            }
                        </p>
                        <a href="/contact" className="inline-flex items-center justify-center px-10 py-5 bg-pixio-yellow text-black font-black text-xs uppercase tracking-[0.2em] rounded-full hover:scale-105 transition-all shadow-xl">
                            {locale === 'ar' ? 'تواصل مع الدعم' : locale === 'en' ? 'Contact Support' : 'Contacter le Support'}
                        </a>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    )
}
