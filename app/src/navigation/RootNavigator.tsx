import React, { useEffect, useRef, useState } from "react";
import { DefaultTheme, NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, font, shadow } from "@/theme";
import { useAuth } from "@/providers/AuthProvider";
import { usePendingInvite } from "@/providers/PendingInviteProvider";
import LoginScreen from "@/screens/auth/LoginScreen";
import RegisterScreen from "@/screens/auth/RegisterScreen";
import HomeScreen from "@/screens/HomeScreen";
import GlobalScreen from "@/screens/GlobalScreen";
import CreateChallengeScreen from "@/screens/CreateChallengeScreen";
import CommunityScreen from "@/screens/CommunityScreen";
import MeScreen from "@/screens/MeScreen";
import ChallengeDetailScreen from "@/screens/ChallengeDetailScreen";
import ManageSupportersScreen from "@/screens/ManageSupportersScreen";
import AskForHelpScreen from "@/screens/AskForHelpScreen";
import HelpRequestDetailScreen from "@/screens/HelpRequestDetailScreen";
import GlobalChallengeDetailScreen from "@/screens/GlobalChallengeDetailScreen";
import EditExpertiseScreen from "@/screens/EditExpertiseScreen";
import InviteFriendScreen from "@/screens/InviteFriendScreen";
import InviteLandingScreen from "@/screens/InviteLandingScreen";
import CommunityTreeScreen from "@/screens/CommunityTreeScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import LineFriendGate from "@/components/LineFriendGate";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  InviteLanding: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Global: undefined;
  Challenge: undefined; // แท็บ ➕ Challenge — Flow 2/3
  Community: undefined;
  Me: undefined;
};

export type RootStackParamList = {
  // หน้าแรกของแต่ละแท็บ (อยู่ก้น stack ของแท็บนั้น ๆ)
  HomeMain: undefined;
  GlobalMain: undefined;
  ChallengeMain: undefined;
  CommunityMain: undefined;
  MeMain: undefined;
  // หน้าย่อยที่ใช้ร่วมกันทุกแท็บ
  ChallengeDetail: { challengeId: string };
  ManageSupporters: { challengeId: string };
  AskForHelp: { challengeId: string };
  HelpRequestDetail: { helpRequestId: string; category?: string };
  GlobalChallengeDetail: { globalChallengeId: string };
  EditExpertise: undefined;
  InviteFriend: { challengeId: string };
  InviteLanding: undefined;
  CommunityTree: undefined; // 🌏 ต้นไม้รวมความสำเร็จของทั้งชุมชน
  Notifications: undefined; // 🔔 เรื่องที่เกี่ยวข้องกับเรา
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// ธีมของ React Navigation เองก็ต้องตั้งด้วย ไม่งั้นพื้นหลังระหว่างสลับหน้าจะ
// เป็นสีขาวล้วนตัดกับพื้นหลังนวล ๆ ของแอป
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
  },
};

function AuthNavigator() {
  // ถ้ามีคนกดลิงก์ "ท้าเพื่อน" มาก่อน login ให้เห็นตัวอย่าง Challenge
  // ก่อนหน้า Login/Register (Flow ฟีเจอร์ใหม่ — ดู InviteLandingScreen)
  const { token } = usePendingInvite();
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={token ? "InviteLanding" : "Login"}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="InviteLanding" component={InviteLandingScreen} />
    </AuthStack.Navigator>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// โครงสร้างการนำทาง (ปรับตาม feedback ของผู้ใช้: "ให้แถบแท็บโชว์ทุกหน้า")
//
// Tab เป็นตัวนอกสุด แล้วแต่ละแท็บมี Stack ของตัวเอง ซึ่งบรรจุทั้งหน้าแรกของ
// แท็บนั้นและหน้าย่อยทั้งหมด → เปิดหน้าย่อยจากแท็บไหน หน้านั้นก็เปิดอยู่
// "ข้างใน" แท็บนั้น แถบแท็บด้านล่างจึงยังอยู่ตลอด สลับแท็บได้ตลอดเวลา
//
// หมายเหตุ: หน้าย่อยชุดเดียวกันถูกประกาศซ้ำในทุกแท็บโดยตั้งใจ (เป็น pattern
// มาตรฐานของ React Navigation) — navigate("ChallengeDetail") จะไปเปิดใน stack
// ของแท็บที่กำลังใช้งานอยู่เสมอ ไม่ข้ามแท็บกัน
// ────────────────────────────────────────────────────────────────────────────
// คืนค่าเป็น React.Fragment ที่ห่อ Stack.Screen ไว้ข้างใน — React Navigation
// อนุญาตให้ direct child ของ Navigator เป็น Screen, Group หรือ React.Fragment
// เท่านั้น (ห้ามเป็น component ของเราเอง) จึงต้องเรียกเป็นฟังก์ชันธรรมดาแบบนี้
function sharedDetailScreens() {
  return (
    <>
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} options={{ title: "Challenge" }} />
      <Stack.Screen name="ManageSupporters" component={ManageSupportersScreen} options={{ title: "ผู้สนับสนุน" }} />
      <Stack.Screen name="AskForHelp" component={AskForHelpScreen} options={{ title: "ขอความช่วยเหลือ" }} />
      <Stack.Screen name="HelpRequestDetail" component={HelpRequestDetailScreen} options={{ title: "ชุมชนช่วยตอบ" }} />
      <Stack.Screen
        name="GlobalChallengeDetail"
        component={GlobalChallengeDetailScreen}
        options={{ title: "Global Challenge" }}
      />
      <Stack.Screen name="EditExpertise" component={EditExpertiseScreen} options={{ title: "ฉันช่วยอะไรได้บ้าง" }} />
      <Stack.Screen name="InviteFriend" component={InviteFriendScreen} options={{ title: "ท้าเพื่อน" }} />
      <Stack.Screen name="InviteLanding" component={InviteLandingScreen} options={{ title: "คำท้า" }} />
      <Stack.Screen name="CommunityTree" component={CommunityTreeScreen} options={{ title: "ต้นไม้ของพวกเรา" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "การแจ้งเตือน" }} />
    </>
  );
}

// header ของหน้าย่อย: พื้นหลังกลืนกับแอป ไม่มีเส้นแบ่ง/เงา ตัวหนังสือหนา
const stackScreenOptions = {
  headerTitleAlign: "center" as const,
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "700" as const, fontSize: font.h3 },
  contentStyle: { backgroundColor: colors.bg },
};

// หน้าแรกของแต่ละแท็บซ่อน header ของ navigator ไว้ เพราะแต่ละหน้าวาดหัวข้อ
// ของตัวเอง (ทักทายผู้ใช้ / โปรไฟล์ / ชื่อหน้า) ให้สวยกว่า header มาตรฐาน
const tabRootOptions = { headerShown: false };

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={tabRootOptions} />
      {sharedDetailScreens()}
    </Stack.Navigator>
  );
}

function GlobalStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="GlobalMain" component={GlobalScreen} options={tabRootOptions} />
      {sharedDetailScreens()}
    </Stack.Navigator>
  );
}

function ChallengeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="ChallengeMain" component={CreateChallengeScreen} options={tabRootOptions} />
      {sharedDetailScreens()}
    </Stack.Navigator>
  );
}

function CommunityStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="CommunityMain" component={CommunityScreen} options={tabRootOptions} />
      {sharedDetailScreens()}
    </Stack.Navigator>
  );
}

function MeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="MeMain" component={MeScreen} options={tabRootOptions} />
      {sharedDetailScreens()}
    </Stack.Navigator>
  );
}

/** ไอคอนแท็บ — ใช้อิโมจิเพื่อไม่ต้องเพิ่ม dependency ชุดไอคอนเข้ามาใหม่ */
function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={[styles.tabIcon, !focused && styles.tabIconIdle]}>{glyph}</Text>;
}

/**
 * ปุ่ม ➕ ตรงกลางแถบแท็บ — ทำเป็นวงกลมสีเขียวลอยขึ้นมาเหนือแถบ ตามดีไซน์
 * ที่ผู้ใช้ส่งมา เพื่อให้ "สร้าง Challenge ใหม่" เป็นปุ่มที่เด่นที่สุดในแอป
 */
function CreateTabButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  const focused = !!accessibilityState?.selected;
  return (
    <View style={styles.fabSlot}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="สร้าง Challenge ใหม่"
        style={({ pressed }) => [
          styles.fab,
          focused && { backgroundColor: colors.primaryDark },
          pressed && { opacity: 0.9 },
        ]}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

// 5 แท็บหลักตาม USER-FLOWS.md §0/§18: Home, Global, ➕, Community, Me
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: { paddingTop: 6 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ title: "Home", tabBarIcon: ({ focused }) => <TabIcon glyph="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Global"
        component={GlobalStack}
        options={{ title: "Global", tabBarIcon: ({ focused }) => <TabIcon glyph="🌏" focused={focused} /> }}
      />
      <Tab.Screen
        name="Challenge"
        component={ChallengeStack}
        options={{ title: "", tabBarButton: (props) => <CreateTabButton {...props} /> }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityStack}
        options={{ title: "Community", tabBarIcon: ({ focused }) => <TabIcon glyph="❤️" focused={focused} /> }}
      />
      <Tab.Screen
        name="Me"
        component={MeStack}
        options={{ title: "Me", tabBarIcon: ({ focused }) => <TabIcon glyph="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading } = useAuth();
  const { token } = usePendingInvite();
  const navRef = useNavigationContainerRef();
  const [navReady, setNavReady] = useState(false);
  const redirectedForToken = useRef<string | null>(null);

  // ถ้า login อยู่แล้ว แล้วมีคนกดลิงก์ "ท้าเพื่อน" เข้ามา (เช่น login คนละ
  // เครื่อง หรือเปิดลิงก์ตอนใช้แอปอยู่แล้ว) ให้พาไปหน้า InviteLanding ทันที
  // ครั้งเดียวต่อหนึ่ง token (กันลูปกดซ้ำเวลา re-render)
  useEffect(() => {
    if (!navReady || !session?.user) return;
    if (token && redirectedForToken.current !== token) {
      redirectedForToken.current = token;
      navRef.navigate("Home" as never, { screen: "InviteLanding" } as never);
    }
    if (!token) redirectedForToken.current = null;
  }, [navReady, session, token, navRef]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef} theme={navTheme} onReady={() => setNavReady(true)}>
      {/* เข้าแอปได้ต่อเมื่อแอดเพื่อนกับ LINE OA แล้ว — ไม่งั้นเราส่งข้อความหาเขาไม่ได้
          พอปิดแอปไปก็หายไปเลย (ด่านนี้ปล่อยผ่านเองถ้าเช็คไม่ได้ เช่นเข้าด้วยอีเมล) */}
      {!session ? (
        <AuthNavigator />
      ) : (
        <LineFriendGate>
          <MainTabs />
        </LineFriendGate>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  tabBar: {
    height: 66,
    paddingBottom: 8,
    paddingTop: 4,
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tabLabel: { fontSize: font.tiny, fontWeight: "600", marginTop: -2 },
  tabIcon: { fontSize: 20 },
  tabIconIdle: { opacity: 0.45 },
  fabSlot: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.card,
    ...shadow.float,
  },
  fabPlus: { color: colors.onPrimary, fontSize: 28, lineHeight: 32, fontWeight: "400", marginTop: -2 },
});
