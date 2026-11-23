import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { getChatMessages, sendMessage } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/useAuthStore';

export default function ChatScreen() {
  const { exchangeId } = useLocalSearchParams();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { customer } = useAuthStore();

  const [messages, setMessages] = useState<any[]>([]);
  const [details, setDetails] = useState<{ bookTitle?: string; otherParticipant?: string }>({});
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = async () => {
    try {
      if (!exchangeId) return;
      const data = await getChatMessages(exchangeId as string);
      setMessages(data.chat.messages);
      setDetails(data.exchangeDetails);
    } catch (e) {
      console.log('Error fetching messages', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // "WebSockets" simulés : Polling très rapide toutes les 2 secondes pour le temps réel
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [exchangeId]);

  const handleSend = async () => {
    if (!inputText.trim() || !exchangeId) return;
    
    setSending(true);
    try {
      await sendMessage(exchangeId as string, inputText.trim());
      setInputText('');
      await fetchMessages();
      // Scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.log('Error sending message', e);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    const isMe = item.senderId === customer?.id;
    
    // Pour simplifier l'affichage de l'avatar du correspondant
    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.senderId !== item.senderId);

    return (
      <View style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        {!isMe && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              <View style={[styles.avatar, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="person" size={16} color={colors.textSecondary} />
              </View>
            ) : <View style={{ width: 28 }} />}
          </View>
        )}
        
        {isMe ? (
          <LinearGradient
            colors={['#0274DF', '#025AB0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.messageBubble, styles.myMessage]}
          >
            <Text style={{ color: '#FFF', fontSize: 15, lineHeight: 22 }}>{item.content}</Text>
            <Text style={[styles.timeText, { color: 'rgba(255,255,255,0.7)' }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.messageBubble, styles.theirMessage, { backgroundColor: colors.backgroundElement, shadowColor: scheme === 'dark' ? '#000' : '#CBD5E1' }]}>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{item.content}</Text>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: scheme === 'dark' ? '#333' : '#F1F5F9' }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Ionicons name="person-circle" size={40} color={colors.textSecondary} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerName, { color: colors.text }]}>{details.otherParticipant || 'Chargement...'}</Text>
            <Text style={[styles.headerBook, { color: '#0274DF' }]} numberOfLines={1}>{details.bookTitle}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0274DF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>
                Envoyez le premier message pour lancer la discussion !
              </Text>
            }
          />
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: scheme === 'dark' ? '#333' : '#E2E8F0' }]}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundElement }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Écrivez un message..."
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
          </View>
          <TouchableOpacity 
            style={[styles.sendBtnWrapper, (!inputText.trim() || sending) && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#0274DF', '#025AB0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.sendBtn}
            >
              {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" style={{ marginLeft: 4 }} />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, 
    borderBottomWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { marginRight: 12 },
  headerTextContainer: { flex: 1, justifyContent: 'center' },
  headerName: { fontSize: 17, fontWeight: 'bold' },
  headerBook: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  moreBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  
  messageList: { padding: 16, paddingBottom: 24 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  avatarContainer: { marginRight: 8, paddingBottom: 4 },
  avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  messageBubble: { maxWidth: '78%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  myMessage: { borderBottomRightRadius: 4 },
  theirMessage: { borderBottomLeftRadius: 4, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 6, fontWeight: '500' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  inputWrapper: { flex: 1, borderRadius: 24, minHeight: 48, justifyContent: 'center' },
  input: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, maxHeight: 120, fontSize: 15, lineHeight: 20 },
  sendBtnWrapper: { marginLeft: 12, marginBottom: 2 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#0274DF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }
});
