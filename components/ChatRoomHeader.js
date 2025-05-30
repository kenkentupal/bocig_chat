import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import React from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

export default function ChatRoomHeader({ item, navigation }) {
  const router = useRouter();

  // Handle back button press with fallbacks for different scenarios
  const handleBackPress = () => {
    // First try the navigation prop if available
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // If navigation doesn't work or we're on web after refresh,
    // use the router to go to home screen
    router.replace("/home");
  };

  return (
    <SafeAreaView
      style={{
        backgroundColor: "#fff",
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >
      <View className="bg-white pt-3 pb-3">
        <View className="flex-row items-center mx-4">
          {/* Back button with enhanced handling */}
          <TouchableOpacity
            onPress={handleBackPress}
            className="p-2 mr-2"
            style={{ marginLeft: -8 }}
          >
            <Ionicons name="chevron-back" size={hp(3.5)} color="#000" />
          </TouchableOpacity>

          {/* Avatar */}
          {item?.profileUrl && (
            <Image
              source={{ uri: item.profileUrl }}
              style={{ height: hp(5), width: hp(5) }}
              className="rounded-full bg-neutral-200"
            />
          )}

          {/* User info */}
          <View className="ml-3 flex-1">
            <Text className="text-neutral-800 font-bold text-lg">
              {item?.username || "Chat"}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
