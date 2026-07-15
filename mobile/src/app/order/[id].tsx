import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getOrderDetails } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';

const STATUS_COLOR: Record<string, string> = {
  PENDING:    '#F59E0B',
  CONFIRMED:  '#3B82F6',
  PROCESSING: '#8B5CF6',
  SHIPPED:    '#06B6D4',
  DELIVERED:  '#10B981',
  CANCELLED:  '#EF4444',
  RETURNED:   '#6B7280',
};

export default function OrderTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrderDetails(id as string),
    enabled: !!id,
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#0274DF" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Impossible de charger la commande.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#0274DF', fontWeight: 'bold' }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Suivi de commande</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Commande #{order.id.substring(0, 8).toUpperCase()}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement, marginTop: Spacing.four }]}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
            Total: {order.total.toFixed(2)} MAD
          </Text>
          {order.trackingID && (
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              Tracking ID: {order.trackingID}
            </Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Historique</Text>

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          {order.statusHistory && order.statusHistory.length > 0 ? (
            order.statusHistory.map((historyItem: any, index: number) => {
              const isLast = index === order.statusHistory.length - 1;
              const statusColor = STATUS_COLOR[historyItem.status] || '#6B7280';
              return (
                <View key={index} style={styles.timelineItem}>
                  {/* Ligne & Point */}
                  <View style={styles.timelineIndicator}>
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    {!isLast && <View style={[styles.line, { backgroundColor: colors.backgroundSelected }]} />}
                  </View>
                  
                  {/* Contenu */}
                  <View style={styles.timelineContent}>
                    <Text style={[styles.statusTitle, { color: statusColor }]}>
                      {historyItem.status}
                    </Text>
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                      {formatDate(historyItem.createdAt)}
                    </Text>
                    {historyItem.comment && (
                      <Text style={[styles.commentText, { color: colors.text }]}>
                        {historyItem.comment}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={{ color: colors.textSecondary }}>Aucun historique disponible.</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:        { padding: Spacing.four, paddingBottom: 100 },
  topBar:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.three },
  backText:         { fontSize: 16, color: '#0274DF', fontWeight: '600' },
  title:            { fontSize: 28, fontWeight: '800' },
  subtitle:         { fontSize: 15, marginTop: 4 },
  card:             { padding: Spacing.four, borderRadius: 12, marginBottom: Spacing.five },
  sectionTitle:     { fontSize: 20, fontWeight: 'bold', marginBottom: Spacing.four },
  
  timelineContainer:{ paddingLeft: 10 },
  timelineItem:     { flexDirection: 'row', marginBottom: 20 },
  timelineIndicator:{ alignItems: 'center', width: 24, marginRight: 12 },
  dot:              { width: 14, height: 14, borderRadius: 7, zIndex: 1 },
  line:             { width: 2, flex: 1, marginTop: 4, marginBottom: -24 }, // line goes down to next item
  
  timelineContent:  { flex: 1, paddingBottom: 10 },
  statusTitle:      { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  dateText:         { fontSize: 13, marginBottom: 4 },
  commentText:      { fontSize: 14, fontStyle: 'italic', marginTop: 4 },
});
