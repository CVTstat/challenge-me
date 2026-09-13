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
  MainTabs: undefined;
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
const RootStack = createNativeStackNavigator<RootStackParamList>();

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

// 5 แท็บหลักตาม USER-FLOWS.md §0/§18: Home, Global, Challenge, Community, Me
function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "🏠 Home" }} />
      <Tab.Screen name="Global" component={GlobalScreen} options={{ title: "🌎 Global" }} />
      <Tab.Screen name="Challenge" component={CreateChallengeScreen} options={{ title: "➕ Challenge" }} />
      <Tab.Screen name="Community" component={CommunityScreen} options={{ title: "❤️ Community" }} />
      <Tab.Screen name="Me" component={MeScreen} options={{ title: "👤 Me" }} />
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
      navRef.navigate("InviteLanding" as never);
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
      {!session ? (
        <AuthNavigator />
      ) : (
        <RootStack.Navigator>
          <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <RootStack.Screen
            name="ChallengeDetail"
            component={ChallengeDetailScreen}
            options={{ title: "Challenge" }}
          />
          <RootStack.Screen
            name="ManageSupporters"
            component={ManageSupportersScreen}
            options={{ title: "Supporters" }}
          />
          <RootStack.Screen name="AskForHelp" component={AskForHelpScreen} options={{ title: "Ask for Help" }} />
          <RootStack.Screen
            name="HelpRequestDetail"
            component={HelpRequestDetailScreen}
            options={{ title: "Community Help" }}
          />
          <RootStack.Screen
            name="GlobalChallengeDetail"
            component={GlobalChallengeDetailScreen}
            options={{ title: "Global Challenge" }}
          />
          <RootStack.Screen
            name="EditExpertise"
            component={EditExpertiseScreen}
            options={{ title: "What I Can Help With" }}
          />
          <RootStack.Screen name="InviteFriend" component={InviteFriendScreen} options={{ title: "ท้าเพื่อน" }} />
          <RootStack.Screen name="InviteLanding" component={InviteLandingScreen} options={{ title: "คำท้า" }} />
          <RootStack.Screen
            name="CommunityTree"
            component={CommunityTreeScreen}
            options={{ title: "🌏 ต้นไม้ของพวกเรา" }}
          />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}
