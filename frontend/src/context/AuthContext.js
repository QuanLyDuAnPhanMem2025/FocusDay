import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import api from "../api/axios";

const STORAGE_KEY = "focusday-user-profile";
const AuthContext = createContext(null);

// Decode JWT payload (for idToken fallback)
const decodeJwtPayload = (jwt) => {
  try {
    if (!jwt) return null;
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    // atob exists in RN/Hermes in most setups; if not, we just skip fallback
    if (typeof atob !== "function") return null;

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 🔍 DEBUG: log env
  useEffect(() => {
    console.log(
      "[Auth][DEBUG] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =",
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    );
  }, []);

  // 1) Configure Google Sign-In (native)
  useEffect(() => {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    if (!webClientId) {
      console.warn("[Auth][ERROR] Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env");
      return;
    }

    console.log("[Auth][DEBUG] Calling GoogleSignin.configure()");

    GoogleSignin.configure({
      webClientId,
      scopes: ["email", "profile"], // ✅ ensure email/profile scope
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
  }, []);

  // 2) Load saved user
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setUser(JSON.parse(stored));
      } catch (e) {
        console.warn("[Auth] Không thể tải user đã lưu", e);
      }
    })();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    console.log("[Auth][UI] Google button pressed");

    try {
      setIsAuthenticating(true);

      console.log("[Auth][DEBUG] Checking Google Play Services...");
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      console.log("[Auth][DEBUG] Signing out old session (if any)");
      try {
        await GoogleSignin.signOut();
      } catch (_) {}

      console.log("[Auth][DEBUG] Calling GoogleSignin.signIn()");
      const result = await GoogleSignin.signIn();

      console.log(
        "[Auth][DEBUG] Google sign-in result JSON =",
        JSON.stringify(result, null, 2)
      );

      // ✅ Parse user across library versions
      const u = result?.data?.user || result?.user;

      let profile = {
        name: u?.name || "",
        email: u?.email || "",
        picture: u?.photo || "",
      };

      // Fallback: try email from idToken payload (if user.email missing)
      if (!profile.email) {
        const tokens = await GoogleSignin.getTokens().catch(() => null);
        console.log("[Auth][DEBUG] tokens =", tokens);

        const payload = decodeJwtPayload(tokens?.idToken);
        console.log("[Auth][DEBUG] decoded idToken payload =", payload);

        if (payload?.email) {
          profile.email = payload.email;
        }
      }

      console.log("[Auth][DEBUG] parsed profile =", profile);

      if (!profile.email) {
        Alert.alert(
          "Đăng nhập thất bại",
          "Google không trả về email. Hãy thử đổi tài khoản Google trên emulator (remove account rồi add lại)."
        );
        return;
      }

      setUser(profile);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));

      try {
        const googleId = u?.id || u?.userId || u?._id;
        const res = await api.post("/users/get-or-create", {
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          googleId: googleId || null,
        });
        const persisted = res?.data;
        console.log("[Auth][DEBUG] upsert user ok:", persisted);
        if (persisted?._id) {
          const merged = { ...profile, _id: persisted._id };
          setUser(merged);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      } catch (err) {
        console.warn(
          "[Auth][WARN] upsert user failed:",
          err?.response?.data || err?.message
        );
      }
    } catch (e) {
      console.error("[Auth][ERROR] Google Sign-In error FULL =", e);
      console.error("[Auth][ERROR] code =", e?.code);
      console.error("[Auth][ERROR] message =", e?.message);

      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (e?.code === statusCodes.IN_PROGRESS) {
        Alert.alert("Đang đăng nhập", "Vui lòng chờ...");
        return;
      }
      if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Thiếu Google Play Services", "Emulator chưa có Google Play Services.");
        return;
      }

      Alert.alert("Đăng nhập thất bại", "Vui lòng thử lại sau.");
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch (_) {}

    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (_) {}

    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticating, signInWithGoogle, signOut }),
    [user, isAuthenticating, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng bên trong AuthProvider");
  return ctx;
};
