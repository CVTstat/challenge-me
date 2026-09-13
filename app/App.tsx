import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/providers/AuthProvider";
import { PendingInviteProvider } from "@/providers/PendingInviteProvider";
import RootNavigator from "@/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <PendingInviteProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </PendingInviteProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
