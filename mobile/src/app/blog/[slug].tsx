import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBlogPost, getImageUrl } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HTML from 'react-native-render-html';

export default function BlogPostScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { width } = useWindowDimensions();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await getBlogPost(slug as string);
        if (data.success) {
          setPost(data.post);
        }
      } catch (error) {
        console.error('Failed to load blog post:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#0274DF" />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Article introuvable</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: '#FFF' }}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {post.category || 'Blog'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {post.coverImage && (
          <Image source={{ uri: getImageUrl(post.coverImage) || post.coverImage }} style={styles.cover} />
        )}
        
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
          
          <View style={styles.metaRow}>
            {post.author?.image ? (
              <Image source={{ uri: getImageUrl(post.author.image) || post.author.image }} style={styles.authorImg} />
            ) : (
              <View style={[styles.authorPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="person" size={16} color={colors.textSecondary} />
              </View>
            )}
            <View>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {post.authorName || post.author?.fullName || 'Auteur inconnu'}
              </Text>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {new Date(post.createdAt).toLocaleDateString()} • {post.totalReadTime} min
              </Text>
            </View>
          </View>

          {post.excerpt && (
            <Text style={[styles.excerpt, { color: colors.textSecondary }]}>{post.excerpt}</Text>
          )}

          <HTML
            source={{ html: post.content }}
            contentWidth={width - Spacing.four * 2}
            tagsStyles={{
              p: { color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: 12 },
              h1: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 12 },
              h2: { color: colors.text, fontSize: 22, fontWeight: 'bold', marginVertical: 12 },
              h3: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
              a: { color: '#0274DF', textDecorationLine: 'underline' },
              img: { borderRadius: 8, marginVertical: 12 },
              li: { color: colors.text, fontSize: 16, lineHeight: 24 }
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.two,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  cover: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  content: {
    padding: Spacing.four,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: Spacing.four,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  authorImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
  },
  excerpt: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: '#0274DF',
    paddingLeft: 12,
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: '#0274DF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  }
});
