import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
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

type LocalMessage = ChatMessage & {
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'read' | null;
};

function statusLabel(status?: LocalMessage['delivery_status']): string {
  switch (status) {
    case 'sending':
      return '○';
    case 'sent':
      return '✓';
    case 'delivered':
      return '✓✓';
    case 'read':
      return '✓✓';
    default:
      return '';
  }
}

function statusColor(status?: LocalMessage['delivery_status']): string {
  return status === 'read' ? '#93c5fd' : 'rgba(255,255,255,0.75)';
}

export function MissionChat({ missionId, currentUserId }: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async (silent = false) => {
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
        const refreshed = await getMessages(conv.id);
        setMessages(refreshed);
      }
    } catch {
      if (!silent) {
        /* chat indisponible */
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (!messages.length) return;
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const onSend = async () => {
    if (!conversationId || !text.trim() || !canWrite || !currentUserId) return;
    const content = text.trim();
    const tempId = `temp-${Date.now()}`;
    const optimistic: LocalMessage = {
      id: tempId,
      sender: {
        id: currentUserId,
        first_name: '',
        last_name: '',
      },
      content,
      message_type: 'text',
      is_read: false,
      delivery_status: 'sending',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setSending(true);
    try {
      await sendMessage(conversationId, content);
      await load(true);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
      console.warn(e instanceof ApiError ? e.message : 'Envoi impossible');
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
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((item) => {
          const own = item.sender.id === currentUserId;
          const system = item.message_type === 'system';
          const tick = own && !system ? statusLabel(item.delivery_status) : '';
          return (
            <View
              key={item.id}
              style={[styles.bubbleWrap, own && styles.ownWrap, system && styles.systemWrap]}
            >
              <View style={[styles.bubble, own && styles.ownBubble, system && styles.systemBubble]}>
                <Text style={[styles.bubbleText, own && styles.ownText, system && styles.systemText]}>
                  {item.content}
                </Text>
                {tick ? (
                  <Text style={[styles.tick, { color: statusColor(item.delivery_status) }]}>
                    {tick}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  tick: { fontSize: 11, alignSelf: 'flex-end', marginTop: 4 },
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
