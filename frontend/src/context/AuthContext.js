import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY = 'focusday-user-profile';
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const rawGoogleConfig = useMemo(
    () => ({
      expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    }),
    []
  );
  console.log('[Auth] env values', rawGoogleConfig);

  const normalizedGoogleConfig = useMemo(() => {
    const config = { ...rawGoogleConfig };
    if (Platform.OS === 'web' && !config.webClientId) {
      // Chèn placeholder để Expo Web không ném lỗi khi thiếu clientId.
      config.webClientId = 'missing-web-client-id';
    }
    return Object.fromEntries(
      Object.entries(config).filter(([, value]) => Boolean(value))
    );
  }, [rawGoogleConfig]);

  const isGoogleConfigAvailable = useMemo(() => {
    const hasAnyId = Object.values(rawGoogleConfig).some(Boolean);
    if (Platform.OS === 'web') {
      return hasAnyId && Boolean(rawGoogleConfig.webClientId);
    }
    return hasAnyId;
  }, [rawGoogleConfig]);

  const [request, response, promptAsync] = Google.useAuthRequest(normalizedGoogleConfig);

  console.log('[Auth] rawGoogleConfig', rawGoogleConfig);
  console.log('[Auth] request ready?', !!request);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Không thể tải thông tin người dùng đã lưu', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken;
      if (token) {
        fetchGoogleUser(token);
      }
    } else if (response?.type && response.type !== 'success') {
      setIsAuthenticating(false);
      if (response.type !== 'dismiss') {
        Alert.alert('Đăng nhập thất bại', 'Vui lòng thử lại.');
      }
    }
  }, [response]);

  const fetchGoogleUser = async (token) => {
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const info = await userInfoResponse.json();
      if (info?.email) {
        const profile = {
          name: info.name,
          email: info.email,
          picture: info.picture,
        };
        setUser(profile);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } else {
        Alert.alert('Không thể lấy thông tin Google', 'Thiếu email trong phản hồi.');
      }
    } catch (error) {
      console.error('Lỗi lấy thông tin Google', error);
      Alert.alert('Có lỗi xảy ra', 'Không thể lấy thông tin người dùng Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signInWithGoogle = useCallback(async () => {
    console.log('[Auth] signIn pressed', {
      isGoogleConfigAvailable,
      hasRequest: !!request,
    });
    if (!isGoogleConfigAvailable) {
      Alert.alert(
        'Chưa cấu hình Google OAuth',
        'Thiết lập EXPO_PUBLIC_GOOGLE_* trong file môi trường để bật đăng nhập.'
      );
      return;
    }

    if (!request) {
      Alert.alert('Không thể khởi tạo đăng nhập', 'Vui lòng tải lại ứng dụng và thử lại.');
      return;
    }

    try {
      setIsAuthenticating(true);
      console.log('[Auth] calling promptAsync');
      await promptAsync();
    } catch (error) {
      console.error('Đăng nhập Google thất bại', error);
      Alert.alert('Đăng nhập thất bại', 'Vui lòng thử lại sau.');
      setIsAuthenticating(false);
    }
  }, [isGoogleConfigAvailable, request, promptAsync]);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Không thể xóa thông tin người dùng', error);
    } finally {
      setUser(null);
      setIsAuthenticating(false);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticating, signInWithGoogle, signOut }),
    [user, isAuthenticating, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return context;
};
