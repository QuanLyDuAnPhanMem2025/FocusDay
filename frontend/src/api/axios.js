import axios from 'axios';
import { Platform } from 'react-native';

// Tự động detect platform và sử dụng đúng API URL
const getApiUrl = () => {
  // Nếu có biến môi trường, ưu tiên dùng nó
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Lấy port từ biến môi trường hoặc dùng default
  const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '4000'; // Default 4000 để match với backend hiện tại

  // Tự động detect theo platform
  if (Platform.OS === 'web') {
    // Web: dùng localhost
    return `http://localhost:${API_PORT}/api`;
  } else if (Platform.OS === 'android') {
    // Android emulator: dùng 10.0.2.2 để trỏ về localhost của máy host
    return `http://10.0.2.2:${API_PORT}/api`;
  } else {
    // iOS: localhost thường hoạt động
    return `http://localhost:${API_PORT}/api`;
  }
};

const API_URL = getApiUrl();

console.log('[API] Platform:', Platform.OS);
console.log('[API] Base URL:', API_URL);

const instance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Tăng timeout lên 15 giây
  headers: {
    'Content-Type': 'application/json',
  },
});

export default instance;
