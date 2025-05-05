import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import React, { useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Octicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Loading from "../components/Loading.js";
import { Platform } from "react-native";
import { useAuth } from "../context/authContext";
import CustomKeyboardView from "../components/CustomKeyboardView.js";
import CountryPicker from "react-native-country-picker-modal"; // Import country picker

export default function logIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const phoneNumberRef = useRef(""); // Replace emailRef and passwordRef with phoneNumberRef
  const [countryCode, setCountryCode] = useState("US"); // Default country code
  const [callingCode, setCallingCode] = useState("1"); // Default calling code
  const [country, setCountry] = useState(null); // Selected country

  const onSelectCountry = (country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
    setCountry(country);
  };

  return (
    <CustomKeyboardView>
      <StatusBar style="auto" />
      <View
        style={{
          paddingHorizontal: wp(5),
          alignItems: "center",
          justifyContent: "center",
          minHeight: hp(100),
        }}
        className="flex-1"
      >
        {/*Sign in Image*/}
        <View style={{ alignItems: "center" }}>
          <Image
            style={{ height: hp(25), width: wp(50) }}
            resizeMode="contain"
            source={require("../assets/images/boclogo.png")}
          />
        </View>

        <View
          style={{
            width: wp(90),
            maxWidth: 500,
            marginTop: hp(4),
          }}
          className="gap-4"
        >
          <Text
            style={{ fontSize: hp(4) }}
            className="font-bold trackind-wider text-center text-neutral-800"
          >
            Enter your phone number
          </Text>
          <Text
            style={{
              fontSize: hp(2),
              color: "gray",
              textAlign: "center",
              marginTop: hp(1),
            }}
          >
            Make sure this can receive SMS and calls. You'll receive your
            activation code through it.
          </Text>

          {/* Country Picker */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: hp(2),
            }}
          >
            <CountryPicker
              countryCode={countryCode}
              withFilter
              withFlag
              withCallingCode
              withEmoji
              onSelect={onSelectCountry}
              containerButtonStyle={{
                marginRight: wp(2),
                padding: wp(2),
                borderWidth: 1,
                borderColor: "#e5e5e5",
                borderRadius: 10,
                backgroundColor: "#f5f5f5",
              }}
            />
            <Text style={{ fontSize: hp(2), fontWeight: "bold" }}>
              +{callingCode}
            </Text>
          </View>

          {/* Phone Number Input */}
          <View className="gap-2">
            <View
              style={{
                height: hp(7),
                borderColor: "#e5e5e5",
                borderWidth: 1,
                backgroundColor: "#f5f5f5",
                width: wp(90),
                alignSelf: "center",
                marginHorizontal: wp(2),
              }}
              className="flex-row px-4 items-center rounded-2xl"
            >
              <View
                style={{
                  width: Platform.OS === "web" ? wp(2) : wp(7),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Octicons name="device-mobile" size={hp(2.7)} color="gray" />
              </View>
              <TextInput
                style={{
                  fontSize: hp(2),
                  height: hp(7),
                  flex: 1,
                  paddingLeft: Platform.OS === "web" ? wp(1) : wp(3),
                }}
                className="font-semibold text-neutral-700"
                placeholder="Phone Number"
                placeholderTextColor="gray"
                keyboardType="phone-pad"
                onChangeText={(text) =>
                  (phoneNumberRef.current = `+${callingCode}${text}`)
                } // Include country code
              />
            </View>
          </View>
          {/*Forgot Password*/}

          <View>
            {loading ? (
              <View className="flex-row justify-center ">
                <Loading size={hp(6.5)} />
              </View>
            ) : (
              <TouchableOpacity
                style={{
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
                }}
                onPress={""} // Attach handleSignIn here
              >
                <Text
                  style={{
                    fontSize: hp(2.2),
                    color: "#fff",
                    textAlign: "center",
                    fontWeight: "700",
                  }}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </CustomKeyboardView>
  );
}