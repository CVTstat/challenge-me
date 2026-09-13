import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import {
  describeNotification,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  timeAgo,
} from "@/api/notifications";
import type { NotificationRow } from "@/api/notifications";
import { Card, EmptyState } from "@/components/ui";
import { colors, font, radius, spacing } from "@/theme";

// กล่องแจ้งเตือน — เรื่องที่คนอื่นทำแล้วเกี่ยวข้องกับเรา
// กดแต่ละรายการแล้วพาไปยังหน้าที่เกี่ยวข้อง พร้อมทำเครื่องหมายว่าอ่านแล้ว
export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { notifications } = await listMyNotifications(session.user.id);
    setItems(notifications);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleOpen(item: NotificationRow) {
    // ทำเครื่องหมายว่าอ่านแล้วแบบ optimistic — ไม่ต้องรอเซิร์ฟเวอร์ตอบ
    // เพราะผู้ใช้กำลังจะถูกพาไปหน้าอื่นทันที ถ้ารอจะรู้สึกหน่วง
    if (!item.read_at) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
      markNotificationRead(item.id);
    }

    const helpId = item.payload?.help_request_id;
    const challengeId = item.payload?.challenge_id;
    if (helpId) {
      navigation.navigate("HelpRequestDetail", { helpRequestId: helpId });
    } else if (challengeId) {
      navigation.navigate("ChallengeDetail", { challengeId });
    }
  }

  async function handleMarkAll() {
    if (!session?.user) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await markAllNotificationsRead(session.user.id);
  }

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      ListHeaderComponent={
        unread > 0 ? (
          <View style={styles.headerRow}>
            <Text style={styles.headerText}>ยังไม่ได้อ่าน {unread} รายการ</Text>
            <Pressable onPress={handleMarkAll} hitSlop={8}>
              <Text style={styles.markAll}>อ่านทั้งหมดแล้ว</Text>
            </Pressable>
          </View>
        ) : null
      }
      ListEmptyComponent={
        !loading ? (
          <EmptyState
            emoji="🔔"
            title="ยังไม่มีการแจ้งเตือน"
            subtitle="เมื่อมีคนส่งกำลังใจ ท้าคุณ หรือมาตอบคำถามของคุณ จะขึ้นที่นี่"
          />
        ) : null
      }
      renderItem={({ item }) => {
        const { icon, title, body } = describeNotification(item);
        const unreadItem = !item.read_at;
        return (
          <Card style={[styles.card, unreadItem && styles.cardUnread]} onPress={() => handleOpen(item)}>
            <View style={styles.row}>
              <Text style={styles.icon}>{icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, unreadItem && styles.titleUnread]}>{title}</Text>
                {body ? (
                  <Text style={styles.body} numberOfLines={2}>
                    {body}
                  </Text>
                ) : null}
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>
              {unreadItem && <View style={styles.dot} />}
            </View>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: 32, gap: spacing.sm },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  headerText: { fontSize: font.small, color: colors.textMuted, fontWeight: "600" },
  markAll: { fontSize: font.small, color: colors.primary, fontWeight: "700" },
  card: { paddingVertical: spacing.md },
  cardUnread: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  icon: { fontSize: 22, marginTop: 2 },
  title: { fontSize: font.body, color: colors.text, fontWeight: "600" },
  titleUnread: { fontWeight: "800" },
  body: { fontSize: font.small, color: colors.textMuted, marginTop: 3, lineHeight: 19 },
  time: { fontSize: font.tiny, color: colors.textFaint, marginTop: 5 },
  dot: { width: 9, height: 9, borderRadius: radius.pill, backgroundColor: colors.accent, marginTop: 6 },
});
