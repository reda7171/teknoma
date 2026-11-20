import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useI18nStore } from '@/store/useI18nStore';

interface BookKeyInsightsProps {
  title: string;
  author?: string | null;
  description?: string | null;
}

function extractKeyInsights(title: string, author?: string | null, description?: string | null) {
  const defaultInsights = [
    `Comprendre les leviers fondamentaux développés dans "${title}".`,
    `Adopter une méthodologie pratique pour transformer vos habitudes de lecture et de réflexion.`,
    `Passer à l'action avec des concepts clairs et applicables au quotidien.`,
  ];

  if (!description || description.trim().length < 40) {
    return {
      insights: defaultInsights,
      quote: `« Un livre incontournable pour élargir son horizon et enrichir son esprit. »`,
    };
  }

  // Split into clean sentences
  const cleaned = description.replace(/\r\n/g, ' ').replace(/\n/g, ' ');
  const rawSentences = cleaned
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 180);

  let insights: string[] = [];
  if (rawSentences.length >= 3) {
    insights = rawSentences.slice(0, 3).map((s) => (s.endsWith('.') ? s : `${s}.`));
  } else if (rawSentences.length > 0) {
    insights = rawSentences.map((s) => (s.endsWith('.') ? s : `${s}.`));
    while (insights.length < 3) {
      insights.push(defaultInsights[insights.length]);
    }
  } else {
    insights = defaultInsights;
  }

  // Choose quote
  const quote =
    rawSentences.length > 3 && rawSentences[3].length >= 30
      ? `« ${rawSentences[3]} »`
      : `« ${title} offre une perspective captivante et intemporelle${author ? ` signée ${author}` : ''}. »`;

  return { insights, quote };
}

export const BookKeyInsights: React.FC<BookKeyInsightsProps> = ({ title, author, description }) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { t } = useI18nStore();

  const { insights, quote } = extractKeyInsights(title, author, description);

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: scheme === 'dark' ? '#334155' : '#E2E8F0' }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="bulb-outline" size={20} color="#0274DF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t('key_insights')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('key_insights_desc')}</Text>
        </View>
      </View>

      {/* 3 Idées forces */}
      <View style={styles.insightsList}>
        {insights.map((item, index) => (
          <View key={index} style={styles.insightItem}>
            <View style={styles.bulletBadge}>
              <Text style={styles.bulletNumber}>{index + 1}</Text>
            </View>
            <Text style={[styles.insightText, { color: colors.text }]}>{item}</Text>
          </View>
        ))}
      </View>

      {/* Citation marquante */}
      <View style={[styles.quoteBox, { backgroundColor: scheme === 'dark' ? '#1E293B' : '#FEF3C7' }]}>
        <View style={styles.quoteHeader}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#D97706" />
          <Text style={styles.quoteLabel}>{t('key_quote')}</Text>
        </View>
        <Text style={[styles.quoteText, { color: scheme === 'dark' ? '#FCD34D' : '#92400E' }]}>{quote}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(2, 116, 223, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  insightsList: {
    gap: 12,
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0274DF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  bulletNumber: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  quoteBox: {
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  quoteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    fontWeight: '500',
  },
});
