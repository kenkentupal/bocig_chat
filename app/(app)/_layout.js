import { View, Text } from "react-native";
import React from "react";
import { Slot, Stack } from "expo-router";
import HomeHeader from "../../components/HomeHeader";

const _layout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="home"
        options={{
          header: () => <HomeHeader />,
        }}
      />
      <Stack.Screen
        name="chatRoom"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="completeprofile" />
    </Stack>
  );
};

export default _layout;
