import React, { useEffect, useRef, useState } from "react";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";

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
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

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
// เดิม: Tab อยู่ข้างในสุดของ Stack ใหญ่ → พอเปิดหน้าย่อย (เช่น Challenge
// Detail, ท้าเพื่อน, ต้นไม้ของชุมชน) หน้าย่อยจะทับเต็มจอ แถบแท็บด้านล่างหายไป
// ต้องกดปุ่มย้อนกลับอย่างเดียวถึงจะกลับมาเห็นแท็บอีกครั้ง
//
// ใหม่: Tab เป็นตัวนอกสุด แล้วแต่ละแท็บมี Stack ของตัวเอง ซึ่งบรรจุทั้งหน้าแรก
// ของแท็บนั้นและหน้าย่อยทั้งหมด → เปิดหน้าย่อยจากแท็บไหน หน้านั้นก็เปิดอยู่
// "ข้างใน" แท็บนั้น แถบแท็บด้านล่างจึงยังอยู่ตลอด สลับแท็บได้ตลอดเวลา
//
// หมายเหตุ: หน้าย่อยชุดเดียวกันถูกประกาศซ้ำในทุกแท็บโดยตั้งใจ (เป็น pattern
// มาตรฐานของ React Navigation) — navigate("ChallengeDetail") จะไปเปิดใน stack
// ของแท็บที่กำลังใช้งานอยู่เสมอ ไม่ข้ามแท็บกัน ประวัติการกดย้อนกลับของแต่ละ
// แท็บจึงแยกกันอย่างอิสระ
// ────────────────────────────────────────────────────────────────────────────
// คืนค่าเป็น React.Fragment ที่ห่อ Stack.Screen ไว้ข้างใน — React Navigation
// อนุญาตให้ direct child ของ Navigator เป็น Screen, Group หรือ React.Fragment
// เท่านั้น (ห้ามเป็น component ของเราเอง) จึงต้องเรียกเป็นฟังก์ชันธรรมดาแบบนี้
// ไม่ใช่เขียนเป็น <SharedDetailScreens />
function sharedDetailScreens() {
  return (
    <>
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} options={{ title: "Challenge" }} />
      <Stack.Screen name="ManageSupporters" component={ManageSupportersScreen} options={{ title: "Supporters" }} />
      <Stack.Screen name="AskForHelp" component={AskForHelpScreen} options={{ title: "Ask for Help" }} />
      <Stack.Screen
        name="HelpRequestDetail"
        component={HelpRequestDetailScreen}
        options={{ title: "Community Help" }}
      />
      <Stack.Screen
        name="GlobalChallengeDetail"
        component={GlobalChallengeDetailScreen}
        options={{ title: "Global Challenge" }}
      />
      <Stack.Screen name="EditExpertise" component={EditExpertiseScreen} options={{ title: "What I Can Help With" }} />
      <Stack.Screen name="InviteFriend" component={InviteFriendScreen} options={{ title: "ท้าเพื่อน" }} />
      <Stack.Screen name="InviteLanding" component={InviteLandingScreen} options={{ title: "คำท้า" }} />
      <Stack.Screen name="CommunityTree" component={CommunityTreeScreen} options={{ title: "🌏 ต้นไม้ของพวกเรา" }} />
    </>
  );
}

const stackScreenOptions = { headerTitleAlign: "center" as const };

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: "🏠 Home" }} />
      {sharedDetailScreens()}
    </Stack.Navigator>
  );
}

function GlobalStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="GlobalMain" component={GlobalScreen} options={{ title: "🌎 Global" }} />
      {sharedDetailScreens()}
    </Stack.Navigator>
  );
}

function ChallengeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="ChallengeMain" component={CreateChallengeScreen} options={{ title: "➕ Challenge" }} />
      {sharedDetailScreens()}
    </Stack.Navigator>
  );
}

function CommunityStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="CommunityMain" component={CommunityScreen} options={{ title: "❤️ Community" }} />
      {sharedDetailScreens()}
    </Stack.Navigator>
  );
}

function MeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="MeMain" component={MeScreen} options={{ title: "👤 Me" }} />
      {sharedDetailScreens()}
    </Stack.Navigator>
  );
}

// 5 แท็บหลักตาม USER-FLOWS.md §0/§18: Home, Global, Challenge, Community, Me
// ปิด header ของตัว Tab เอง เพราะ header จริงมาจาก Stack ข้างในของแต่ละแท็บ
// (ไม่งั้นจะเห็นแถบหัวข้อซ้อนกันสองชั้น)
function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeStack} options={{ title: "🏠 Home" }} />
      <Tab.Screen name="Global" component={GlobalStack} options={{ title: "🌎 Global" }} />
      <Tab.Screen name="Challenge" component={ChallengeStack} options={{ title: "➕ Challenge" }} />
      <Tab.Screen name="Community" component={CommunityStack} options={{ title: "❤️ Community" }} />
      <Tab.Screen name="Me" component={MeStack} options={{ title: "👤 Me" }} />
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
      // ระบุแท็บให้ชัดเจนว่าไปเปิดใน stack ของแท็บ Home (รูปแบบมาตรฐานสำหรับ
      // navigator ซ้อนกัน) — ไม่พึ่งการเดาว่าตอนนี้โฟกัสอยู่แท็บไหน
      navRef.navigate("Home" as never, { screen: "InviteLanding" } as never);
    }
    if (!token) redirectedForToken.current = null;
  }, [navReady, session, token, navRef]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef} onReady={() => setNavReady(true)}>
      {!session ? <AuthNavigator /> : <MainTabs />}
    </NavigationContainer>
  );
}
