import {
  View,
  Text,
  Alert,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Animated,
  Pressable,
  Platform,
} from "react-native";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { useChat } from "../../context/chatContext";
import { useAuth } from "../../context/authContext";
import ChatRoomHeader from "../../components/ChatRoomHeader";
import MessageList from "../../components/MessageList";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  AntDesign,
} from "@expo/vector-icons";
import { db } from "../../firebaseConfig";
import { getRoomId } from "../../utils/common";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { createUploadTask, cancelActiveUpload } from "../../utils/storageUtils";
import {
  setDoc,
  doc,
  serverTimestamp,
  collection,
  addDoc,
  writeBatch,
  getDocs,
  where,
  query,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

export default function ChatRoom() {
  // Hooks
  const router = useRouter();
  const { selectedChatUser: item, setSelectedChatUser } = useChat();
  const { user } = useAuth();

  // Handle case where page is reloaded and selectedChatUser is lost
  useEffect(() => {
    // If there's no selected chat user (e.g., after page reload)
    // We should redirect to home or retrieve user data from another source
    if (!item?.uid) {
      // Option 1: Redirect to home
      // router.replace("/home");

      // Option 2: Attempt to retrieve from URL params or localStorage
      // This is just a placeholder - implement based on your app's structure
      const attemptRecoverUser = async () => {
        try {
          // For web, you could store in localStorage
          if (Platform.OS === "web" && window.localStorage) {
            const savedUserData =
              window.localStorage.getItem("selectedChatUser");
            if (savedUserData) {
              const parsedUser = JSON.parse(savedUserData);
              setSelectedChatUser(parsedUser);
            }
          }
        } catch (error) {
          console.log("Error recovering user:", error);
        }
      };

      attemptRecoverUser();
    } else if (Platform.OS === "web" && window.localStorage) {
      // Save for potential page reloads
      window.localStorage.setItem("selectedChatUser", JSON.stringify(item));
    }
  }, [item, router, setSelectedChatUser]);

  // State
  const [inputValue, setInputValue] = useState("");
  const [inputHeight, setInputHeight] = useState(hp(5.5));
  const [messages, setMessages] = useState([]);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const slideAnimation = useRef(new Animated.Value(0)).current;

  // Refs
  const textRef = useRef("");
  const inputRef = useRef(null);

  // Add new state variables
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Function to pick images - restrict to images only and force image type
  const pickImage = async () => {
    try {
      if (Platform.OS === "web") {
        // Web approach - use input element directly for more control
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        // Create a promise to handle the file selection
        const filePromise = new Promise((resolve) => {
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              // Create a file object with proper type information
              resolve({
                uri: URL.createObjectURL(file),
                name: file.name,
                type: file.type || "image/jpeg", // Force image type if missing
                size: file.size,
                nativeFile: file, // Keep reference to the native File object
                isImage: true, // Explicitly set isImage flag
              });
            } else {
              resolve(null);
            }
          };
        });

        // Trigger the file dialog
        input.click();

        // Wait for user selection
        const fileResult = await filePromise;
        if (fileResult) {
          console.log("Web file picked:", fileResult);
          uploadAndSendFile(fileResult);
        }
      } else {
        // Native platforms - use existing approach
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only images
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const selectedAsset = result.assets[0];
          uploadAndSendFile(selectedAsset);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error picking image:", error.message);
    }
  };

  // Function to pick images or videos
  const pickMedia = async () => {
    try {
      if (Platform.OS === "web") {
        // Web approach - use input element directly for more control
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*,video/*";

        // Create a promise to handle the file selection
        const filePromise = new Promise((resolve) => {
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              // Detect if image or video
              const isImage = file.type.startsWith("image/");
              const isVideo = file.type.startsWith("video/");
              resolve({
                uri: URL.createObjectURL(file),
                name: file.name,
                type:
                  file.type ||
                  (isImage
                    ? "image/jpeg"
                    : isVideo
                      ? "video/mp4"
                      : "application/octet-stream"),
                size: file.size,
                nativeFile: file, // Keep reference to the native File object
                isImage,
                isVideo,
              });
            } else {
              resolve(null);
            }
          };
        });

        // Trigger the file dialog
        input.click();

        // Wait for user selection
        const fileResult = await filePromise;
        if (fileResult) {
          uploadAndSendFile(fileResult);
        }
      } else {
        // Native platforms - use image picker for both images and videos
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both images and videos
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const selectedAsset = result.assets[0];
          // Add isImage/isVideo flags for consistency
          const isImage =
            selectedAsset.type === "image" ||
            (selectedAsset.mimeType &&
              selectedAsset.mimeType.startsWith("image/"));
          const isVideo =
            selectedAsset.type === "video" ||
            (selectedAsset.mimeType &&
              selectedAsset.mimeType.startsWith("video/"));
          uploadAndSendFile({ ...selectedAsset, isImage, isVideo });
        }
      }
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert("Error picking media:", error.message);
    }
  };

  // Function to pick documents
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "text/plain",
        ],
        copyToCacheDirectory: true,
      });

      if (
        result.canceled === false &&
        result.assets &&
        result.assets.length > 0
      ) {
        const selectedDoc = result.assets[0];
        uploadAndSendFile(selectedDoc);
      }
    } catch (error) {
      Alert.alert("Error picking document:", error.message);
    }
  };

  // Upload and send file - modified with better error handling
  const uploadAndSendFile = async (file) => {
    if (!user?.uid || !item?.uid) return;

    // Validate file object first
    if (!file) {
      console.error("File object is undefined");
      Alert.alert("Error", "Invalid file object");
      return;
    }

    console.log("File object received:", JSON.stringify(file, null, 2));

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Handle platform differences in file objects
      let fileObj, fileExtension, fileType, isImage, fileSize, fileName;

      if (Platform.OS === "web") {
        // Web-specific handling
        fileObj = file.nativeFile || file;

        // Get file extension and name safely
        fileName = file.name || "unknown_file";
        fileExtension = fileName.includes(".")
          ? fileName.split(".").pop().toLowerCase()
          : "unknown";

        fileType = file.type || `application/${fileExtension}`;
        fileSize = file.size || 0;

        isImage =
          file.isImage === true ||
          (fileType && fileType.startsWith("image/")) ||
          ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileExtension);
      } else {
        // Native platform handling with proper validation
        if (!file.uri) {
          throw new Error("File URI is missing");
        }

        // Safe extraction of file extension
        const uriParts = file.uri.split(".");
        fileExtension =
          uriParts.length > 1
            ? uriParts[uriParts.length - 1].toLowerCase()
            : "unknown";

        fileType = file.mimeType || file.type || `file/${fileExtension}`;
        fileName = file.name || `File_${new Date().getTime()}.${fileExtension}`;
        fileSize = file.fileSize || file.size || 0;

        isImage =
          fileType.startsWith("image/") ||
          ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(fileExtension);

        fileObj = file;
      }

      // Create a unique path for the file
      const filePath = `chats/${getRoomId(
        user.uid,
        item.uid
      )}/files/${new Date().getTime()}_${fileName.replace(
        /[^a-zA-Z0-9.]/g,
        "_"
      )}`;

      console.log("Processed file info:", {
        platform: Platform.OS,
        fileName,
        fileType,
        fileExtension,
        fileSize,
        isImage,
      });

      // Upload file
      let uploadResult;
      try {
        uploadResult = await createUploadTask(fileObj, filePath, (progress) => {
          setUploadProgress(progress);
        });
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
        Alert.alert(
          "Upload failed",
          uploadError.message || "Could not upload file"
        );
        setIsUploading(false);
        return;
      }

      if (uploadResult.canceled || !uploadResult.url) {
        console.log("Upload was canceled or failed");
        setIsUploading(false);
        return;
      }

      // Create and send message
      let roomId = getRoomId(user?.uid, item?.uid);
      const docRef = doc(db, "rooms", roomId);
      const messageRef = collection(docRef, "messages");

      // For web images, force these fields to ensure proper rendering
      const messageData = {
        senderId: user?.uid,
        receiverId: item?.uid,
        text: "",
        fileUrl: uploadResult.url,
        fileName: fileName,
        fileType: fileType,
        fileSize: fileSize,
        isImage: isImage,
        profileUrl: user?.profileUrl,
        senderName: user?.username,
        createdAt: serverTimestamp(),
        seen: false,
      };

      // Extra properties for web images to ensure they render correctly
      if (isImage) {
        messageData._isWebImage = true;
        messageData._imageExtension = fileExtension;
      }

      await addDoc(messageRef, messageData);
    } catch (error) {
      console.error("Error during file upload:", error);
      Alert.alert("Error", error.message || "An unexpected error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  // Show/hide attachment menu with animation
  const toggleAttachmentMenu = useCallback(() => {
    if (showAttachmentOptions) {
      // Hide menu
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowAttachmentOptions(false));
    } else {
      // Show menu
      setShowAttachmentOptions(true);
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showAttachmentOptions, slideAnimation]);

  // Create a chat room if it doesn't exist
  const createRoomIfNotExists = async () => {
    let roomId = getRoomId(user?.uid, item?.uid);
    await setDoc(
      doc(db, "rooms", roomId),
      {
        roomId,
        users: [user.uid, item.uid],
        lastMessage: null,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  // Mark messages from the other user as seen
  const markMessagesAsSeen = async () => {
    if (!user?.uid || !item?.uid) return;

    try {
      let roomId = getRoomId(user?.uid, item?.uid);
      const docRef = doc(db, "rooms", roomId);
      const messageRef = collection(docRef, "messages");

      // Query unread messages from the other user
      const q = query(
        messageRef,
        where("senderId", "==", item.uid),
        where("seen", "==", false)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return;

      // Batch update all messages to seen=true
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { seen: true });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  };

  // Send a new message
  const handleSendMessage = async () => {
    let message = textRef.current.trim();
    if (!message) return;

    try {
      let roomId = getRoomId(user?.uid, item?.uid);
      const docRef = doc(db, "rooms", roomId);
      const messageRef = collection(docRef, "messages");

      // Add message to Firestore
      await addDoc(messageRef, {
        senderId: user?.uid,
        receiverId: item?.uid,
        text: message,
        profileUrl: user?.profileUrl,
        senderName: user?.username,
        createdAt: serverTimestamp(),
        seen: false,
      });

      // Clear input
      setInputValue("");
      textRef.current = "";
    } catch (error) {
      Alert.alert("Error sending message: ", error);
    }
  };

  // Listen for messages and mark as seen
  useEffect(() => {
    if (!user?.uid || !item?.uid) return;

    createRoomIfNotExists();

    // Set up listener for messages
    let roomId = getRoomId(user?.uid, item?.uid);
    const docRef = doc(db, "rooms", roomId);
    const messageRef = collection(docRef, "messages");
    const q = query(messageRef, orderBy("createdAt", "asc"));

    let unsubscribe = onSnapshot(q, (querySnapshot) => {
      // Update messages state
      let messages = querySnapshot.docs.map((doc) => {
        return { id: doc.id, ...doc.data() };
      });
      setMessages(messages);

      // Mark messages as seen when loaded
      markMessagesAsSeen();
    });

    return () => unsubscribe();
  }, [item, user]);

  // Platform-specific attachment menu handling
  const renderAttachmentMenu = () => {
    if (Platform.OS === "web") {
      // Web view - dropdown menu above attachment button
      return (
        showAttachmentOptions && (
          <View
            className="absolute bottom-16 left-4 bg-white rounded-lg shadow-lg z-10 overflow-hidden"
            style={{
              width: 180,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <TouchableOpacity
              className="flex-row items-center px-4 py-3 border-b border-gray-100"
              onPress={() => {
                setShowAttachmentOptions(false);
                setTimeout(() => pickMedia(), 100);
              }}
            >
              <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-3">
                <Ionicons name="image" size={hp(2)} color="#0084ff" />
              </View>
              <Text className="text-gray-800">Image/Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              onPress={() => {
                setShowAttachmentOptions(false);
                setTimeout(() => pickDocument(), 100);
              }}
            >
              <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-3">
                <Ionicons name="document-text" size={hp(2)} color="#0084ff" />
              </View>
              <Text className="text-gray-800">Document</Text>
            </TouchableOpacity>
          </View>
        )
      );
    } else {
      // Mobile view - bottom sheet modal
      return (
        <Modal
          transparent={true}
          visible={showAttachmentOptions}
          animationType="none"
          onRequestClose={toggleAttachmentMenu}
        >
          <Pressable
            className="flex-1 bg-black/30"
            onPress={toggleAttachmentMenu}
          >
            <Animated.View
              className="absolute bottom-0 w-full bg-white rounded-t-3xl shadow-lg"
              style={{
                transform: [
                  {
                    translateY: slideAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              }}
            >
              {/* Header */}
              <View className="border-b border-gray-200 pt-2 pb-4">
                <View className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                <Text className="text-lg font-semibold text-center">
                  Attach File
                </Text>
              </View>

              {/* Attachment options */}
              <View className="flex-row px-4 py-6 justify-around">
                <TouchableOpacity
                  className="items-center"
                  onPress={() => {
                    toggleAttachmentMenu();
                    setTimeout(() => pickMedia(), 300);
                  }}
                >
                  <View className="w-14 h-14 bg-blue-50 rounded-full items-center justify-center mb-2">
                    <Ionicons name="image" size={hp(3.5)} color="#0084ff" />
                  </View>
                  <Text className="text-sm text-gray-800">Image/Video</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="items-center"
                  onPress={() => {
                    toggleAttachmentMenu();
                    setTimeout(() => pickDocument(), 300);
                  }}
                >
                  <View className="w-14 h-14 bg-blue-50 rounded-full items-center justify-center mb-2">
                    <Ionicons
                      name="document-text"
                      size={hp(3.5)}
                      color="#0084ff"
                    />
                  </View>
                  <Text className="text-sm text-gray-800">Document</Text>
                </TouchableOpacity>
              </View>

              {/* Cancel button */}
              <TouchableOpacity
                className="border-t border-gray-200 p-4"
                onPress={toggleAttachmentMenu}
              >
                <Text className="text-center font-medium text-blue-600">
                  Cancel
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Modal>
      );
    }
  };

  // Handle file attachment options - simplified for both platforms
  const handleMenuPress = () => {
    if (Platform.OS === "web") {
      setShowAttachmentOptions(!showAttachmentOptions);
    } else {
      toggleAttachmentMenu();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          header: ({ navigation }) => (
            <>
              <ChatRoomHeader item={item} navigation={navigation} />
              <View className="h-1 border-b border-neutral-300"></View>
            </>
          ),
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-white">
        <StatusBar style="dark" />

        {/* Use platform-specific attachment menu */}
        {renderAttachmentMenu()}

        {/* Main chat interface */}
        <View className="flex-1 justify-between bg-neutral-00 overflow-visible">
          {/* Message list */}
          <View className="flex-1">
            <MessageList messages={messages} currentUser={user} />
          </View>

          {/* Upload progress indicator */}
          {isUploading && (
            <View className="bg-blue-50 px-4 py-2 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#0084ff" />
                <Text className="ml-2 text-blue-600">
                  Uploading file... {uploadProgress.toFixed(0)}%
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  cancelActiveUpload();
                  setIsUploading(false);
                }}
                className="bg-red-100 rounded-full p-1"
              >
                <AntDesign name="close" size={hp(2)} color="red" />
              </TouchableOpacity>
            </View>
          )}

          {/* Message input area */}
          <View className="pt-2 pb-2 bg-white border-t border-gray-200">
            <View className="flex-row items-center mx-2 my-1">
              {/* Menu button - updated with proper positioning for web dropdown */}
              <View className="relative">
                <TouchableOpacity
                  onPress={handleMenuPress}
                  className="p-2 bg-blue-50 rounded-full"
                >
                  <Ionicons name="attach" size={hp(2.4)} color="#0084ff" />
                </TouchableOpacity>
              </View>

              {/* Text input + send button */}
              <View
                className="flex-row flex-1 bg-gray-100 px-3 rounded-full ml-1"
                style={{
                  alignItems: "center",
                  minHeight: hp(5),
                }}
              >
                <TextInput
                  ref={inputRef}
                  placeholder="Type a message..."
                  className="flex-1 py-2 text-base text-neutral-800"
                  multiline
                  value={inputValue}
                  onChangeText={(value) => {
                    textRef.current = value;
                    setInputValue(value);
                  }}
                  style={{
                    fontSize: hp(2),
                    minHeight: hp(4.5),
                    maxHeight: hp(10),
                    height: inputHeight,
                    paddingVertical: 8,
                  }}
                />
                <TouchableOpacity onPress={handleSendMessage} className="p-2">
                  <Ionicons name="send" size={hp(2.4)} color="#0084ff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}
