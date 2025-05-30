import { FlatList } from "react-native";
import React, { useRef, useState, useCallback } from "react";
import MessageItem from "./MessageItem";
import FileMessage from "./FileMessage";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Ionicons } from "@expo/vector-icons";

import { View, Text, Image } from "react-native";

export default function MessageList({ messages, currentUser }) {
  const scrollViewRef = useRef(null);
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Show only the latest visibleCount messages
  const pagedMessages = [...messages].slice(-visibleCount).reverse();

  const handleLoadMore = useCallback(() => {
    if (visibleCount < messages.length) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, messages.length));
    }
  }, [visibleCount, messages.length]);

  // Helper function to detect image files - same improved logic as FileMessage
  const isImageFile = (message) => {
    // Direct flags from upload handling
    if (message.isImage === true || message._isWebImage === true) return true;

    // Web-specific properties
    if (
      message._imageExtension &&
      ["jpg", "jpeg", "png", "gif", "webp"].includes(message._imageExtension)
    ) {
      return true;
    }

    // MIME type check
    if (
      message.fileType &&
      (message.fileType.startsWith("image/") ||
        message.fileType.includes("image"))
    )
      return true;

    // File extension check from filename
    if (message.fileName) {
      const lowerFileName = message.fileName.toLowerCase();
      const imageExtensions = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp",
        "svg",
      ];
      for (const ext of imageExtensions) {
        if (lowerFileName.endsWith(`.${ext}`)) return true;
      }
    }

    // URL pattern check
    if (message.fileUrl) {
      const lowerUrl = message.fileUrl.toLowerCase();
      // Check for image-specific URL patterns or extensions
      if (
        lowerUrl.includes("/image/") ||
        lowerUrl.includes("images") ||
        lowerUrl.endsWith(".jpg") ||
        lowerUrl.endsWith(".jpeg") ||
        lowerUrl.endsWith(".png") ||
        lowerUrl.endsWith(".gif") ||
        lowerUrl.includes("image-")
      ) {
        return true;
      }

      // Common cloud storage image patterns
      if (
        lowerUrl.includes("cloudinary.com") ||
        lowerUrl.includes("firebasestorage") ||
        lowerUrl.includes("storage.googleapis.com")
      ) {
        // Additional check for image-like URL patterns in cloud storage
        if (
          lowerUrl.includes("image") ||
          /\.(jpg|jpeg|png|gif|webp)/i.test(lowerUrl)
        ) {
          return true;
        }
      }
    }

    return false;
  };

  // Render a single file or media message (no grouping)
  const renderFileMessage = (message, isCurrentUser) => {
    return (
      <View
        key={message.id}
        className={`mb-1.5 ${isCurrentUser ? "pr-3 pl-14" : "pl-3 pr-14"}`}
      >
        <View
          className={`flex-row items-start ${
            isCurrentUser ? "justify-end" : ""
          }`}
        >
          {!isCurrentUser && (
            <View className="h-8 w-8 mr-2 mt-1">
              <Image
                source={{
                  uri: message.profileUrl || "https://placekitten.com/200/200",
                }}
                className="w-8 h-8 rounded-full bg-gray-300"
              />
            </View>
          )}
          <View className="max-w-[80%]">
            <FileMessage file={message} isCurrentUser={isCurrentUser} />
            {/* Time display */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: isCurrentUser ? "flex-end" : "flex-start",
                marginTop: 4,
                marginLeft: isCurrentUser ? 0 : 2,
                marginRight: isCurrentUser ? 2 : 0,
                marginBottom: 2,
              }}
            >
              <Text
                style={{
                  fontSize: hp(1.5),
                  color: "#65676B",
                  marginRight: isCurrentUser ? 4 : 0,
                }}
              >
                {message.createdAt && message.createdAt.toDate
                  ? message.createdAt.toDate().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Just now"}
              </Text>
              {isCurrentUser && (
                <View>
                  {message?.seen ? (
                    <Ionicons
                      name="checkmark-done"
                      size={hp(1.6)}
                      color="#0084ff"
                    />
                  ) : (
                    <Ionicons name="checkmark" size={hp(1.6)} color="#737373" />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      ref={scrollViewRef}
      data={pagedMessages}
      inverted
      keyExtractor={(item, index) =>
        item.id ? item.id.toString() : index.toString()
      }
      renderItem={({ item: message, index }) => {
        const isImage = isImageFile(message);
        const isVideo =
          message.fileType && message.fileType.startsWith("video/");
        const isFile = message.fileUrl;
        const isCurrentUser = message.senderId === currentUser?.uid;
        if (isImage || isVideo || isFile) {
          return renderFileMessage(message, isCurrentUser);
        }
        // For regular text messages
        return (
          <View
            key={message.id || index}
            className={`mb-1.5 ${isCurrentUser ? "pr-3 pl-14" : "pl-3 pr-14"}`}
          >
            <View
              className={`flex-row items-start ${isCurrentUser ? "justify-end" : ""}`}
            >
              {!isCurrentUser && (
                <View className="h-8 w-8 mr-2 mt-1">
                  <Image
                    source={{
                      uri:
                        message.profileUrl || "https://placekitten.com/200/200",
                    }}
                    className="w-8 h-8 rounded-full bg-gray-300"
                  />
                </View>
              )}
              <MessageItem message={message} currentUser={currentUser} />
            </View>
          </View>
        );
      }}
      ListFooterComponent={
        visibleCount < messages.length ? (
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ color: "#888", fontSize: 14 }}>
              See older messages
            </Text>
          </View>
        ) : null
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 8 }}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      onScrollToIndexFailed={() => {}}
      // Optionally, you can add getItemLayout for performance if messages are fixed height
    />
  );
}
