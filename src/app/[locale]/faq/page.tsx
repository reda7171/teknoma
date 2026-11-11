import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import Breadcrumbs from '@/components/Breadcrumbs'
import Script from 'next/script'
import { HelpCircle, Truck, CreditCard, RotateCcw, ShieldCheck, ChevronDown, BookOpen, Users, Package } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Metadata } from 'next'
import { Link } from '@/i18n/routing'
import { STORE_POLICY } from '@/lib/constants/store-policy'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params

    const titles: Record<string, string> = {
        fr: 'FAQ — Vos Questions sur Riwaya | Livraison, Paiement, Retours',
        ar: 'الأسئلة الشائعة — رواية | التوصيل، الدفع، الإرجاع',
        en: 'FAQ — Your Questions about Riwaya | Delivery, Payment, Returns',
    }
    const descriptions: Record<string, string> = {
        fr: `Toutes les réponses à vos questions sur la librairie Riwaya : livraison ${STORE_POLICY.deliveryMajorCitiesMinHours}-${STORE_POLICY.deliveryMajorCitiesMaxHours}h au Maroc (${STORE_POLICY.shippingFeeMorocco} MAD, gratuit dès ${STORE_POLICY.freeShippingThreshold} MAD), COD et retours ${STORE_POLICY.returnWindowDays} jours.`,
        ar: `إجابات شاملة حول مكتبة رواية: التوصيل في المغرب (${STORE_POLICY.shippingFeeMorocco} درهم ومجاني ابتداءً من ${STORE_POLICY.freeShippingThreshold} درهم)، الدفع عند الاستلام والإرجاع خلال ${STORE_POLICY.returnWindowDays} أيام.`,
        en: `Answers about Riwaya bookstore: delivery in Morocco (${STORE_POLICY.shippingFeeMorocco} MAD, free from ${STORE_POLICY.freeShippingThreshold} MAD), international Amana shipping (${STORE_POLICY.shippingFeeWorldwide} MAD), COD, and ${STORE_POLICY.returnWindowDays}-day returns.`,
    }

    return {
        title: titles[locale] || titles.fr,
        description: descriptions[locale] || descriptions.fr,
        alternates: {
            canonical: `https://riwaya.store/${locale}/faq`,
            languages: {
                'fr': 'https://riwaya.store/fr/faq',
                'ar': 'https://riwaya.store/ar/faq',
                'en': 'https://riwaya.store/en/faq',
                'x-default': 'https://riwaya.store/ar/faq',
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
                    a: locale === 'ar'
                        ? `للمدن الكبرى (الرباط، الدار البيضاء، سلا، تمارة...)، يتم التوصيل خلال ${STORE_POLICY.deliveryMajorCitiesMinHours} إلى ${STORE_POLICY.deliveryMajorCitiesMaxHours} ساعة. لباقي مناطق المغرب، يستغرق التوصيل ${STORE_POLICY.deliveryOtherRegionsHours}.`
                        : locale === 'en'
                            ? `For major cities (Rabat, Casablanca, Salé, Temara...), delivery takes ${STORE_POLICY.deliveryMajorCitiesMinHours} to ${STORE_POLICY.deliveryMajorCitiesMaxHours}h. For other regions in Morocco, expect ${STORE_POLICY.deliveryOtherRegionsHours}.`
                            : `Pour les grandes villes (Rabat, Casablanca, Salé, Témara...), la livraison s'effectue en ${STORE_POLICY.deliveryMajorCitiesMinHours}-${STORE_POLICY.deliveryMajorCitiesMaxHours}h. Pour les autres régions du Maroc, comptez ${STORE_POLICY.deliveryOtherRegionsHours}.`
                },
                {
                    q: locale === 'ar' ? 'هل يمكنني تتبع طردي؟' : locale === 'en' ? 'Can I track my package?' : 'Puis-je suivre mon colis ?',
                    a: locale === 'ar' ? 'نعم، بمجرد شحن طلبك ستتلقى رقم تتبع عبر الرسائل القصيرة أو البريد الإلكتروني. يمكنك أيضًا مراجعة صفحة "تتبع طلبي" على موقعنا.' : locale === 'en' ? "Yes, once your order is shipped, you will receive a tracking number via SMS or email. You can also check the 'Track my order' page on our site." : "Oui, dès l'expédition de votre commande, vous recevrez un numéro de suivi par SMS ou Email. Vous pouvez également consulter la page 'Suivre ma commande' sur notre site."
                },
                {
                    q: locale === 'ar' ? 'ما هي تكاليف التوصيل؟' : locale === 'en' ? 'What are the delivery costs?' : 'Quels sont les frais de livraison ?',
                    a: locale === 'ar'
                        ? `التوصيل الموحد في المغرب بـ ${STORE_POLICY.shippingFeeMorocco} درهم، ومجاني لكل طلب يبلغ ${STORE_POLICY.freeShippingThreshold} درهم أو أكثر. الشحن الدولي عبر أمانة ابتداءً من ${STORE_POLICY.shippingFeeWorldwide} درهم.`
                        : locale === 'en'
                            ? `Standard shipping anywhere in Morocco is a flat ${STORE_POLICY.shippingFeeMorocco} MAD, and free for orders of ${STORE_POLICY.freeShippingThreshold} MAD or more. Worldwide tracked Amana shipping starts at ${STORE_POLICY.shippingFeeWorldwide} MAD.`
                            : `La livraison partout au Maroc est au tarif unique de ${STORE_POLICY.shippingFeeMorocco} MAD, et gratuite dès ${STORE_POLICY.freeShippingThreshold} MAD d'achat. L'expédition internationale via Amana est proposée dès ${STORE_POLICY.shippingFeeWorldwide} MAD.`
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
                    a: locale === 'ar'
                        ? `نعم، لديكم مهلة ${STORE_POLICY.returnWindowDays} أيام بعد الاستلام لطلب الإرجاع في حالته الأصلية. الاسترجاع أو الاستبدال مجاني بالكامل إذا كان الكتاب معيباً أو غير مطابق للطلب.`
                        : locale === 'en'
                            ? `Yes, you have ${STORE_POLICY.returnWindowDays} calendar days after delivery to request a return in original unread condition. Returns and replacements are 100% free if the item arrived damaged or incorrect.`
                            : `Oui, vous disposez de ${STORE_POLICY.returnWindowDays} jours calendaires après réception pour demander un retour en état neuf non lu. Le retour ou remplacement est 100 % gratuit si l'ouvrage est endommagé ou non conforme.`
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
            title: locale === 'ar' ? 'عن رواية' : locale === 'en' ? 'About Riwaya' : 'À propos de Riwaya',
            icon: Users,
            questions: [
                {
                    q: locale === 'ar' ? 'ما هي مكتبة رواية؟' : locale === 'en' ? 'What is Riwaya bookstore?' : "Qu'est-ce que la librairie Riwaya ?",
                    a: locale === 'ar' ? 'رواية هي أحسن مكتبة إلكترونية في المغرب. نقدم أكبر مجموعة من روايات التطوير الذاتي والأعمال والفلسفة، مع توصيل سريع في جميع أنحاء المغرب والدفع عند الاستلام.' : locale === 'en' ? "Riwaya is Morocco's best online bookstore. We offer the largest selection of personal development, business, and philosophy books, with fast delivery across Morocco and cash on delivery payment." : "Riwaya est la meilleure librairie en ligne au Maroc. Nous offrons la plus grande sélection de livres de développement personnel, business et philosophie, avec une livraison rapide partout au Maroc et le paiement à la livraison."
                },
                {
                    q: locale === 'ar' ? 'أين يقع مقر مكتبة رواية؟' : locale === 'en' ? 'Where is Riwaya bookstore located?' : 'Où est située la librairie Riwaya ?',
                    a: locale === 'ar' ? 'يقع مقرنا في الرباط، المغرب. نوصل إلى جميع مدن المغرب.' : locale === 'en' ? 'Our headquarters is located in Rabat, Morocco. We deliver to all cities in Morocco.' : "Notre siège est situé à Rabat, Maroc. Nous livrons dans toutes les villes du Maroc."
                },
                {
                    q: locale === 'ar' ? 'كيف أتواصل مع مكتبة رواية؟' : locale === 'en' ? 'How do I contact Riwaya bookstore?' : 'Comment contacter la librairie Riwaya ?',
                    a: locale === 'ar'
                        ? `يمكنكم التواصل معنا عبر واتساب أو عبر البريد الإلكتروني ${STORE_POLICY.contactEmail}. فريقنا متاح: ${STORE_POLICY.supportHours.ar}.`
                        : locale === 'en'
                            ? `You can reach us via WhatsApp or at ${STORE_POLICY.contactEmail}. Our support team is available ${STORE_POLICY.supportHours.en}.`
                            : `Vous pouvez nous contacter via WhatsApp ou par email à ${STORE_POLICY.contactEmail}. Notre service client répond ${STORE_POLICY.supportHours.fr}.`
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
                    <Breadcrumbs items={[{ label: locale === 'ar' ? 'الأسئلة الشائعة' : locale === 'en' ? 'FAQ' : 'Questions Fréquentes' }]} className="mb-6 flex justify-center" />
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
                            ? 'كل ما تحتاجون معرفته للطلب باطمئنان من مكتبة رواية.'
                            : locale === 'en'
                                ? 'Everything you need to know to order with peace of mind from Riwaya.'
                                : 'Tout ce que vous devez savoir pour commander en toute sérénité sur Riwaya.'
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
                                ? `دعمنا عبر واتساب والبريد (${STORE_POLICY.contactEmail}) متاح ${STORE_POLICY.supportHours.ar} لمساعدتكم في اختياراتكم أو تتبع طلباتكم.`
                                : locale === 'en'
                                    ? `Our WhatsApp & email support (${STORE_POLICY.contactEmail}) is available ${STORE_POLICY.supportHours.en} to help you with book selection or order tracking.`
                                    : `Notre support WhatsApp et email (${STORE_POLICY.contactEmail}) est disponible ${STORE_POLICY.supportHours.fr} pour vous accompagner.`}
                        </p>
                        <Link href="/contact" className="inline-flex items-center justify-center px-10 py-5 bg-pixio-yellow text-black font-black text-xs uppercase tracking-[0.2em] rounded-full hover:scale-105 transition-all shadow-xl">
                            {locale === 'ar' ? 'تواصل مع الدعم' : locale === 'en' ? 'Contact Support' : 'Contacter le Support'}
                        </Link>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    )
}
