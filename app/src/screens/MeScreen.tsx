import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import type { DarumaRow, ProfileRow } from "@/types/database";

// Flow 12 (USER-FLOWS.md §12) — [Me] > My Daruma + Profile
export default function MeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [darumas, setDarumas] = useState<(DarumaRow & { challenges: { title: string } | null })[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setProfile(profileRow as ProfileRow);

    // My Daruma Collection: join ผ่าน challenges.owner_id (Flow 12/FR16.1)
    const { data: darumaRows } = await supabase
      .from("daruma")
      .select("*, challenges!inner(title, owner_id)")
      .eq("challenges.owner_id", session.user.id);
    setDarumas((darumaRows ?? []) as any);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const completedCount = darumas.filter((d) => d.right_eye_filled_at).length;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{profile?.display_name ?? "..."}</Text>
      <Text style={styles.stats}>
        🔴 {darumas.length} Daruma · 🏆 {completedCount} Goals Completed
      </Text>

      <FlatList
        style={{ marginTop: 16 }}
        data={darumas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.darumaRow}>
            <Text style={styles.darumaEmoji}>{item.right_eye_filled_at ? "👁️👁️" : "👁️◯"}</Text>
            <Text style={styles.darumaTitle}>{item.challenges?.title ?? "-"}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มี Daruma — ไปสร้าง Challenge แรกกันเถอะ</Text>}
      />

      <Pressable style={styles.linkButton} onPress={() => navigation.navigate("EditExpertise")}>
        <Text style={styles.linkButtonText}>🧭 ฉันช่วยคนอื่นเรื่องอะไรได้บ้าง</Text>
      </Pressable>

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>ออกจากระบบ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  name: { fontSize: 22, fontWeight: "700" },
  stats: { color: "#666", marginTop: 4 },
  darumaRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  darumaEmoji: { fontSize: 18 },
  darumaTitle: { fontSize: 15 },
  empty: { color: "#888", marginTop: 24 },
  linkButton: { marginTop: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 },
  linkButtonText: { textAlign: "center", fontWeight: "600", color: "#333" },
  signOutButton: { marginTop: 12, padding: 14, alignItems: "center" },
  signOutText: { color: "#e11d48", fontWeight: "600" },
});
