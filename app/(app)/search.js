import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  BackHandler,
} from "react-native";
import { usersRef } from "../../firebaseConfig";
import { query, where, getDocs } from "firebase/firestore";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";

// Props: currentUser, onUserSelect
export default function SearchUsers({
  currentUser,
  onUserSelect,
  onBack,
  onNewGroup,
}) {
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Handle hardware back button
  useEffect(() => {
    const onHardwareBack = () => {
      if (showSearch) {
        setShowSearch(false);
        setSearch("");
        return true;
      } else if (onBack) {
        onBack();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack
    );
    return () => {
      subscription.remove();
    };
  }, [showSearch, onBack]);

  const fetchAllUsers = async () => {
    const q = query(usersRef, where("uid", "!=", currentUser.uid));
    const querySnapshot = await getDocs(q);
    let data = [];
    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });
    setAllUsers(data);
  };

  const filteredUsers = allUsers.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  // Only contacts, no recents
  const contacts = filteredUsers;

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc", borderRadius: 16 }}>
      {/* Header or Search Bar */}
      {showSearch ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderBottomWidth: 1,
            borderColor: "#e5e7eb",
            backgroundColor: "#fff",
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setShowSearch(false);
              setSearch("");
            }}
            style={{ marginRight: 16 }}
          >
            <AntDesign name="arrowleft" size={26} color="#6366f1" />
          </TouchableOpacity>
          <TextInput
            placeholder="Search by username"
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              fontSize: 16,
              color: "#222",
              backgroundColor: "transparent",
            }}
            placeholderTextColor="#94a3b8"
            autoFocus
          />
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderBottomWidth: 1,
            borderColor: "#e5e7eb",
            backgroundColor: "#fff",
          }}
        >
          <TouchableOpacity onPress={onBack} style={{ marginRight: 16 }}>
            <AntDesign name="arrowleft" size={26} color="#6366f1" />
          </TouchableOpacity>
          <Text
            style={{ flex: 1, color: "#222", fontWeight: "bold", fontSize: 20 }}
          >
            New chat
          </Text>
          <TouchableOpacity onPress={() => setShowSearch(true)}>
            <AntDesign name="search1" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>
      )}
      {/* New Group/Community */}
      <TouchableOpacity
        onPress={onNewGroup}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: "#f9fafb",
          borderBottomWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        <MaterialIcons
          name="group"
          size={28}
          color="#6366f1"
          style={{ marginRight: 16 }}
        />
        <Text style={{ color: "#222", fontSize: 16, fontWeight: '500' }}>New Group Chat</Text>
      </TouchableOpacity>
      <View
        style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 }}
      />
      {/* CONTACTS section - only show if searching and search is not empty */}
      {showSearch && search.trim().length > 0 && (
        <>
          <Text
            style={{
              color: "#6366f1",
              fontSize: 13,
              marginLeft: 16,
              marginBottom: 4,
              fontWeight: 'bold',
              letterSpacing: 1,
            }}
          >
            CONTACTS
          </Text>
          <ScrollView
            style={{ maxHeight: 320 }}
            showsVerticalScrollIndicator={false}
          >
            {contacts.length > 0 ? (
              contacts.map((u) => (
                <TouchableOpacity
                  key={u.uid}
                  onPress={() => onUserSelect(u)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: "#fff",
                    borderBottomWidth: 1,
                    borderColor: "#f1f5f9",
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 32, alignItems: "center", marginRight: 8 }}>
                    <Text
                      style={{ color: "#6366f1", fontWeight: "bold", fontSize: 18 }}
                    >
                      {u.username?.[0]?.toUpperCase() || "?"}
                    </Text>
                  </View>
                  <Image
                    source={{ uri: u.profileUrl }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      marginRight: 14,
                      backgroundColor: "#e5e7eb",
                      borderWidth: 2,
                      borderColor: '#e0e7ff',
                    }}
                  />
                  <Text style={{ color: "#222", fontSize: 17, fontWeight: '500' }}>
                    {u.username}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text
                style={{
                  color: "#64748b",
                  textAlign: "center",
                  marginTop: 32,
                  fontSize: 16,
                }}
              >
                No users found
              </Text>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}
