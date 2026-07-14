import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { Shield, Mail, FileText, AlertTriangle, CheckCircle } from 'lucide-react'

export default async function DMCAPage() {
    return (
        <div className="min-h-screen bg-pixio-cream">
            <Header />
            <main className="max-w-4xl mx-auto px-4 py-24">
                <div className="bg-white rounded-[3rem] p-12 md:p-20 shadow-2xl shadow-black/5 border border-gray-100">
                    <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-10">
                        <Shield className="w-8 h-8" />
                    </div>

                    <h1 className="text-5xl font-black text-black tracking-tighter mb-12 italic">
                        Politique DMCA<span className="text-gray-200">.</span>
                    </h1>

                    <div className="prose prose-lg max-w-none text-gray-500 font-bold uppercase tracking-tight text-xs space-y-12">
                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <AlertTriangle className="w-5 h-5" /> 1. Introduction
                            </h2>
                            <p className="leading-relaxed">
                                Chez <strong>Riwaya</strong>, nous respectons les droits de propriété intellectuelle d'autrui et nous attendons de nos utilisateurs qu'ils en fassent de même. Conformément au Digital Millennium Copyright Act (DMCA), nous répondrons rapidement aux avis de violation de droits d'auteur qui nous sont dûment signalés.
                            </p>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <FileText className="w-5 h-5" /> 2. Signaler une violation
                            </h2>
                            <p className="leading-relaxed">
                                Si vous êtes titulaire de droits d'auteur ou autorisé à agir au nom de l'un d'eux, vous pouvez nous signaler une violation présumée en fournissant les informations suivantes par écrit :
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4 text-[10px]">
                                <li>Une description de l'œuvre protégée par le droit d'auteur qui, selon vous, a été enfreinte.</li>
                                <li>Une description du matériel que vous jugez en infraction et son emplacement sur notre site (URL exacte).</li>
                                <li>Vos coordonnées : adresse, numéro de téléphone et adresse e-mail.</li>
                                <li>Une déclaration confirmant que vous croyez de bonne foi que l'utilisation du matériel n'est pas autorisée par le propriétaire des droits d'auteur.</li>
                                <li>Une déclaration confirmant que les informations fournies sont exactes et que vous êtes autorisé à agir au nom du propriétaire.</li>
                                <li>Votre signature physique ou électronique.</li>
                            </ul>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <CheckCircle className="w-5 h-5" /> 3. Contre-notification
                            </h2>
                            <p className="leading-relaxed">
                                Si vous pensez que votre contenu a été retiré par erreur suite à une réclamation DMCA, vous pouvez soumettre une contre-notification contenant :
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4 text-[10px]">
                                <li>L'identification du matériel retiré et son emplacement précédent.</li>
                                <li>Une déclaration sous peine de parjure indiquant que vous croyez de bonne foi que le matériel a été retiré à la suite d'une erreur ou d'une mauvaise identification.</li>
                                <li>Vos nom, adresse et numéro de téléphone.</li>
                                <li>Votre signature physique ou électronique.</li>
                            </ul>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-black text-xl font-black flex items-center gap-4">
                                <Mail className="w-5 h-5" /> 4. Contact DMCA
                            </h2>
                            <p className="leading-relaxed">
                                Pour toute notification de violation de droits d'auteur ou contre-notification, veuillez contacter notre agent DMCA désigné à l'adresse suivante :
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
