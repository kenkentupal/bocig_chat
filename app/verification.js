import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import CustomKeyboardView from "../components/CustomKeyboardView";
import axios from "axios";
import { useAuth } from "../context/authContext";
import { useLocalSearchParams } from "expo-router";
import messaging from "@react-native-firebase/messaging";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const API_URL =
  "https://asia-southeast1-facialrecognition-4bee2.cloudfunctions.net/api";
const OTP_LENGTH = 6;
const RESEND_OTP_TIME = 300; // 5 minutes in seconds

const Verification = ({ navigation }) => {
  const params = useLocalSearchParams();
  const phone = params.phone || "";

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0); // Start at 0 so button is enabled
  const inputs = useRef([]);
  const { loginWithCustomToken } = useAuth();
  const resendInterval = useRef(null);

  // Auto-advance focus
  const handleChange = (text, idx) => {
    if (/^\d*$/.test(text)) {
      const newOtp = [...otp];
      newOtp[idx] = text.slice(-1);
      setOtp(newOtp);
      if (text && idx < OTP_LENGTH - 1) {
        inputs.current[idx + 1].focus();
      }
      if (newOtp.join("").length === OTP_LENGTH) {
        Keyboard.dismiss();
        handleSubmit(newOtp.join(""));
      }
    }
  };

  // Handle paste (for Android/iOS paste or autofill)
  const handlePaste = (e, idx) => {
    const pasted = e.nativeEvent.text;
    if (pasted.length === OTP_LENGTH && /^\d{6}$/.test(pasted)) {
      setOtp(pasted.split(""));
      handleSubmit(pasted);
    }
  };

  // Placeholder for SMS auto-retrieval (to be implemented with expo-sms-retriever or similar)
  // useEffect(() => { ... }, []);

  // Helper to save FCM token to Firestore if not present or changed
  const saveFcmTokenToFirestore = async (uid, token) => {
    if (!uid || !token) return;
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const authUser = getAuth().currentUser;
      if (!userSnap.exists()) {
        await setDoc(
          userRef,
          {
            uid,
            phone: authUser?.phoneNumber || "",
            email: authUser?.email || "",
            firstName: authUser?.displayName?.split(" ")[0] || "",
            lastName: authUser?.displayName?.split(" ")[1] || "",
            profileUrl: authUser?.photoURL || "",
            username: authUser?.displayName || "",
            createdAt: new Date(),
            fcmToken: token,
          },
          { merge: true }
        );
        console.log("Created user doc with FCM token and profile info");
      } else {
        const data = userSnap.data();
        if (!data.fcmToken || data.fcmToken !== token) {
          await updateDoc(userRef, { fcmToken: token });
          console.log("Created or updated FCM token in Firestore");
        } else {
          console.log("FCM token already up to date");
        }
      }
    } catch (error) {
      console.log("Error saving FCM token to Firestore:", error);
    }
  };

  const handleSubmit = async (code) => {
    setLoading(true);
    setVerified(false);
    try {
      const res = await axios.post(`${API_URL}/verify-code`, { phone, code });
      if (res.data?.token) {
        setVerified(true); // keep button in verifying state
        const result = await loginWithCustomToken(res.data.token);
        if (!result.success) throw result.error;
        // Save FCM token after successful login
        const fcmToken = await messaging().getToken();
        const user = getAuth().currentUser;
        if (user && fcmToken) {
          await saveFcmTokenToFirestore(user.uid, fcmToken);
        }
        // Optionally navigate to home or let AuthContext handle redirect
        // setLoading(false); // Do not set loading false here, let AuthContext handle
      } else {
        throw new Error("Invalid token from server");
      }
    } catch (e) {
      setVerified(false);
      setLoading(false);
      Alert.alert(
        "Verification Failed",
        e.response?.data?.message || e.message
      );
    }
  };

  // Only start timer after resend
  React.useEffect(() => {
    if (resendTimer === 0 && resendInterval.current) {
      clearInterval(resendInterval.current);
      resendInterval.current = null;
    }
    if (resendTimer > 0 && !resendInterval.current) {
      resendInterval.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(resendInterval.current);
            resendInterval.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (resendInterval.current) {
        clearInterval(resendInterval.current);
        resendInterval.current = null;
      }
    };
  }, [resendTimer]);

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/send-code`, { phone });
      setResendTimer(RESEND_OTP_TIME); // Start 5 min countdown after resend
      Alert.alert(
        "OTP Sent",
        "A new verification code has been sent to your phone."
      );
    } catch (e) {
      Alert.alert(
        "Failed to resend OTP",
        e.response?.data?.message || e.message
      );
    }
    setLoading(false);
  };

  return (
    <CustomKeyboardView>
      <StatusBar style="auto" />
      <View style={styles.container}>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to your phone
        </Text>
        <View
          style={styles.otpContainer}
          pointerEvents={loading || verified ? "none" : "auto"}
        >
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => (inputs.current[idx] = ref)}
              style={styles.otpBox}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, idx)}
              onSubmitEditing={() =>
                idx < OTP_LENGTH - 1 && inputs.current[idx + 1].focus()
              }
              onFocus={() => {
                // Clear if user focuses and box is not first
                if (otp[idx] && idx !== 0) {
                  const newOtp = [...otp];
                  newOtp[idx] = "";
                  setOtp(newOtp);
                }
              }}
              onEndEditing={(e) => handlePaste(e, idx)}
              autoFocus={idx === 0}
              returnKeyType="next"
              textContentType={Platform.OS === "ios" ? "oneTimeCode" : "none"}
              editable={!loading && !verified}
            />
          ))}
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            (loading || verified) && { backgroundColor: "#b0b0b0" },
            {
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
          onPress={() => handleSubmit(otp.join(""))}
          disabled={loading || verified || otp.join("").length !== OTP_LENGTH}
        >
          {(loading || verified) && (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={styles.buttonText}>
            {loading || verified ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            alignSelf: "center",
            marginTop: hp(3),
          }}
          onPress={handleResendOtp}
          disabled={resendTimer > 0 || loading || verified}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontSize: 13,
              color: "#888",
              fontStyle: "italic",
              textDecorationLine: "underline",
              textAlign: "center",
              fontWeight: "400",
            }}
          >
            {resendTimer > 0
              ? `Resend OTP in ${Math.floor(resendTimer / 60)}:${(
                  resendTimer % 60
                )
                  .toString()
                  .padStart(2, "0")}s`
              : "Resend OTP"}
          </Text>
        </TouchableOpacity>
      </View>
    </CustomKeyboardView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(5),
    minHeight: hp(100),
    backgroundColor: "#fff",
  },
  title: {
    fontSize: hp(3.5),
    fontWeight: "bold",
    marginBottom: hp(1),
    color: "#222",
  },
  subtitle: {
    fontSize: hp(2),
    color: "gray",
    marginBottom: hp(3),
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: hp(3),
    gap: wp(2),
    paddingHorizontal: wp(8), // Add horizontal padding for responsiveness
    width: "80%", // Ensure container doesn't shrink
    boxSizing: "border-box",
  },
  otpBox: {
    width: wp(12),
    minWidth: 40, // Ensure minimum tap area
    maxWidth: 60, // Prevent too wide on tablets
    height: hp(7),
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    textAlign: "center",
    fontSize: hp(3),
    marginHorizontal: wp(1),
    color: "#222",
    fontWeight: "bold",
  },
  button: {
    width: wp(90),
    alignSelf: "center",
    backgroundColor: "#006bb3",
    borderRadius: 16,
    paddingVertical: hp(1.8),
    marginTop: hp(1),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    fontSize: hp(2.2),
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
});

export default Verification;
