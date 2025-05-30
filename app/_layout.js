import "../global.css";
import { View } from "react-native";
import React, { useEffect } from "react";
import { Slot, useSegments, useRouter } from "expo-router";
import { useAuth, AuthProvider } from "../context/authContext";
import { MenuProvider } from "react-native-popup-menu";
import { ChatProvider } from "../context/chatContext";

const MainLayout = () => {
  const { isAuthenticated } = useAuth();
  const segment = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === undefined) return;

    const inApp = segment[0] === "(app)";
    const isAuthScreen = segment[0] === "signIn" || segment[0] === "signUp";

    // Don't redirect if already on an auth screen
    if (!isAuthenticated && isAuthScreen) return;

    router.replace(
      isAuthenticated ? (inApp ? segment.join("/") : "home") : "signIn"
    );
  }, [isAuthenticated, segment]);

  return <Slot />;
};

export default function RootLayout() {
  return (
    <MenuProvider>
      <AuthProvider>
        <ChatProvider>
          <MainLayout />
        </ChatProvider>
      </AuthProvider>
    </MenuProvider>
  );
}
