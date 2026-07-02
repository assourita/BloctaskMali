import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getMessages,
  getMissionConversation,
  markConversationRead,
  sendMessage,
  type ChatMessage,
} from '../api/chat';
import { colors, radius, spacing } from '../constants/theme';
import { ApiError } from '../api/client';

type Props = {
  missionId: string;
  currentUserId?: string;
};

export function MissionChat({ missionId, currentUserId }: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const conv = await getMissionConversation(missionId);
      if (!conv) {
        setConversationId(null);
        setMessages([]);
        setCanWrite(false);
        return;
      }
      setConversationId(conv.id);
      setCanWrite(conv.can_write !== false && !conv.is_closed);
      const msgs = await getMessages(conv.id);
      setMessages(msgs);
      if (conv.unread_count > 0) {
        await markConversationRead(conv.id);
      }
    } catch {
      /* silencieux si chat indisponible */
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const onSend = async () => {
    if (!conversationId || !text.trim() || !canWrite) return;
    setSending(true);
    try {
      const msg = await sendMessage(conversationId, text.trim());
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Envoi impossible';
      setText((t) => t);
      console.warn(message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!conversationId) {
    return (
      <Text style={styles.hint}>La messagerie s'ouvre lorsque la mission est démarrée.</Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const own = item.sender.id === currentUserId;
          const system = item.message_type === 'system';
          return (
            <View style={[styles.bubbleWrap, own && styles.ownWrap, system && styles.systemWrap]}>
              <View style={[styles.bubble, own && styles.ownBubble, system && styles.systemBubble]}>
                <Text style={[styles.bubbleText, own && styles.ownText, system && styles.systemText]}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />
      {canWrite ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Votre message…"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={onSend} disabled={sending || !text.trim()}>
            <Text style={styles.sendLabel}>{sending ? '…' : 'Envoyer'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.closed}>Messagerie fermée</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 220, maxHeight: 360 },
  center: { padding: spacing.lg, alignItems: 'center' },
  hint: { color: colors.textMuted, fontSize: 13, padding: spacing.md },
  list: { flexGrow: 0 },
  listContent: { paddingVertical: spacing.sm, gap: 8 },
  bubbleWrap: { alignItems: 'flex-start', marginBottom: 6 },
  ownWrap: { alignItems: 'flex-end' },
  systemWrap: { alignItems: 'center' },
  bubble: {
    maxWidth: '85%',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  ownBubble: { backgroundColor: colors.primary },
  systemBubble: { backgroundColor: '#f3f4f6' },
  bubbleText: { color: colors.text, fontSize: 14 },
  ownText: { color: '#fff' },
  systemText: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  sendLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  closed: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
});
