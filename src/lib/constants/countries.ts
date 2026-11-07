export interface Country {
    code: string
    name: string
    nameAr: string
    nameEn: string
    dialCode: string
    flag: string
    placeholder: string
    popular?: boolean
}

export const COUNTRIES: Country[] = [
    // Maghreb & Moyen-Orient
    { code: 'MA', name: 'Maroc', nameAr: 'المغرب', nameEn: 'Morocco', dialCode: '+212', flag: '🇲🇦', placeholder: '06 12 34 56 78', popular: true },
    { code: 'FR', name: 'France', nameAr: 'فرنسا', nameEn: 'France', dialCode: '+33', flag: '🇫🇷', placeholder: '06 12 34 56 78', popular: true },
    { code: 'ES', name: 'Espagne', nameAr: 'إسبانيا', nameEn: 'Spain', dialCode: '+34', flag: '🇪🇸', placeholder: '612 345 678', popular: true },
    { code: 'BE', name: 'Belgique', nameAr: 'بلجيكا', nameEn: 'Belgium', dialCode: '+32', flag: '🇧🇪', placeholder: '470 12 34 56', popular: true },
    { code: 'CA', name: 'Canada', nameAr: 'كندا', nameEn: 'Canada', dialCode: '+1', flag: '🇨🇦', placeholder: '(514) 123-4567', popular: true },
    { code: 'US', name: 'États-Unis', nameAr: 'الولايات المتحدة', nameEn: 'United States', dialCode: '+1', flag: '🇺🇸', placeholder: '(555) 123-4567', popular: true },
    { code: 'SA', name: 'Arabie Saoudite', nameAr: 'السعودية', nameEn: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', placeholder: '050 123 4567', popular: true },
    { code: 'AE', name: 'Émirats Arabes Unis', nameAr: 'الإمارات', nameEn: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', placeholder: '050 123 4567', popular: true },
    { code: 'DZ', name: 'Algérie', nameAr: 'الجزائر', nameEn: 'Algeria', dialCode: '+213', flag: '🇩🇿', placeholder: '0550 12 34 56', popular: true },
    { code: 'TN', name: 'Tunisie', nameAr: 'تونس', nameEn: 'Tunisia', dialCode: '+216', flag: '🇹🇳', placeholder: '20 123 456', popular: true },
    
    // Europe
    { code: 'GB', name: 'Royaume-Uni', nameAr: 'المملكة المتحدة', nameEn: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', placeholder: '7123 456789', popular: true },
    { code: 'DE', name: 'Allemagne', nameAr: 'ألمانيا', nameEn: 'Germany', dialCode: '+49', flag: '🇩🇪', placeholder: '151 12345678', popular: true },
    { code: 'IT', name: 'Italie', nameAr: 'إيطاليا', nameEn: 'Italy', dialCode: '+39', flag: '🇮🇹', placeholder: '312 345 6789', popular: true },
    { code: 'NL', name: 'Pays-Bas', nameAr: 'هولندا', nameEn: 'Netherlands', dialCode: '+31', flag: '🇳🇱', placeholder: '6 12345678', popular: true },
    { code: 'CH', name: 'Suisse', nameAr: 'سويسرا', nameEn: 'Switzerland', dialCode: '+41', flag: '🇨🇭', placeholder: '78 123 45 67', popular: true },
    { code: 'PT', name: 'Portugal', nameAr: 'البرتغال', nameEn: 'Portugal', dialCode: '+351', flag: '🇵🇹', placeholder: '912 345 678' },
    { code: 'SE', name: 'Suède', nameAr: 'السويد', nameEn: 'Sweden', dialCode: '+46', flag: '🇸🇪', placeholder: '70 123 45 67' },
    { code: 'NO', name: 'Norvège', nameAr: 'النرويج', nameEn: 'Norway', dialCode: '+47', flag: '🇳🇴', placeholder: '412 34 567' },
    { code: 'DK', name: 'Danemark', nameAr: 'الدنمارك', nameEn: 'Denmark', dialCode: '+45', flag: '🇩🇰', placeholder: '20 12 34 56' },
    { code: 'TR', name: 'Turquie', nameAr: 'تركيا', nameEn: 'Turkey', dialCode: '+90', flag: '🇹🇷', placeholder: '532 123 45 67' },

    // Afrique
    { code: 'SN', name: 'Sénégal', nameAr: 'السنغال', nameEn: 'Senegal', dialCode: '+221', flag: '🇸🇳', placeholder: '77 123 45 67', popular: true },
    { code: 'CI', name: 'Côte d\'Ivoire', nameAr: 'ساحل العاج', nameEn: 'Ivory Coast', dialCode: '+225', flag: '🇨🇮', placeholder: '07 12 34 56 78', popular: true },
    { code: 'CM', name: 'Cameroun', nameAr: 'الكاميرون', nameEn: 'Cameroon', dialCode: '+237', flag: '🇨🇲', placeholder: '6 71 23 45 67' },
    { code: 'ML', name: 'Mali', nameAr: 'مالي', nameEn: 'Mali', dialCode: '+223', flag: '🇲🇱', placeholder: '65 12 34 56' },
    { code: 'GN', name: 'Guinée', nameAr: 'غينيا', nameEn: 'Guinea', dialCode: '+224', flag: '🇬🇳', placeholder: '622 12 34 56' },
    { code: 'MR', name: 'Mauritanie', nameAr: 'موريتانيا', nameEn: 'Mauritania', dialCode: '+222', flag: '🇲🇷', placeholder: '45 12 34 56' },
    { code: 'EG', name: 'Égypte', nameAr: 'مصر', nameEn: 'Egypt', dialCode: '+20', flag: '🇪🇬', placeholder: '010 1234 5678', popular: true },

    // Moyen-Orient
    { code: 'QA', name: 'Qatar', nameAr: 'قطر', nameEn: 'Qatar', dialCode: '+974', flag: '🇶🇦', placeholder: '3312 3456', popular: true },
    { code: 'KW', name: 'Koweït', nameAr: 'الكويت', nameEn: 'Kuwait', dialCode: '+965', flag: '🇰🇼', placeholder: '9123 4567', popular: true },
    { code: 'BH', name: 'Bahreïn', nameAr: 'البحرين', nameEn: 'Bahrain', dialCode: '+973', flag: '🇧🇭', placeholder: '3612 3456' },
    { code: 'OM', name: 'Oman', nameAr: 'عمان', nameEn: 'Oman', dialCode: '+968', flag: '🇴🇲', placeholder: '9123 4567' },
    { code: 'JO', name: 'Jordanie', nameAr: 'الأردن', nameEn: 'Jordan', dialCode: '+962', flag: '🇯🇴', placeholder: '07 9123 4567' },
    { code: 'LB', name: 'Liban', nameAr: 'لبنان', nameEn: 'Lebanon', dialCode: '+961', flag: '🇱🇧', placeholder: '70 123 456' },
]

export const DEFAULT_COUNTRY = COUNTRIES[0] // Maroc (+212)

/**
 * Detect country by phone input prefix or dial code.
 */
export function detectCountryFromPhone(phone: string): Country | null {
    if (!phone) return null

    const clean = phone.trim().replace(/\s+/g, '')

    // If starts with 06, 07, 05 and not +, it is Morocco local
    if (/^0[5-7]/.test(clean)) {
        return DEFAULT_COUNTRY
    }

    // Check with + or 00 prefix
    const normalized = clean.startsWith('00')
        ? '+' + clean.slice(2)
        : clean.startsWith('+')
        ? clean
        : '+' + clean

    // Match longest dial code first (+212, +966, +33, etc.)
    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length)
    for (const c of sorted) {
        if (normalized.startsWith(c.dialCode)) {
            return c
        }
    }

    return null
}

