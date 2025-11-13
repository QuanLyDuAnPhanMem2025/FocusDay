# FocusDay - Ứng dụng Quản lý Công việc

Ứng dụng quản lý công việc và lịch trình với React Native và Node.js.

## 🚀 Tính năng

- ✅ Quản lý công việc theo ngày/tuần/tháng
- 📅 Lịch tương tác với đánh dấu ngày có công việc
- 🌓 Dark/Light mode
- 🔐 Đăng nhập Google OAuth
- 📊 Thống kê công việc (hoàn thành/tổng cộng/còn lại)
- 🎨 UI/UX hiện đại với animations mượt mà
- 📱 Hỗ trợ đa nền tảng (iOS, Android, Web)

## 📋 Yêu cầu

- Node.js >= 14.x
- MongoDB
- Expo CLI (cho frontend)
- Google OAuth credentials (cho đăng nhập)

## 🛠️ Cài đặt

### Backend

1. Di chuyển vào thư mục backend:
```bash
cd backend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` trong thư mục `backend`:
```env
MONGO_URL=mongodb://localhost:27017/focusday
PORT=5000
```

4. Khởi chạy server:
```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:5000`

### Frontend

1. Di chuyển vào thư mục frontend:
```bash
cd frontend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` trong thư mục `frontend` (nếu cần Google OAuth):
```env
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=your-expo-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
```

4. Khởi chạy ứng dụng:
```bash
npm start
```

## 📱 Sử dụng

1. **Đăng nhập**: Nhấn vào menu (☰) và chọn "Đăng nhập Google" để đăng nhập
2. **Thêm công việc**: Nhấn nút (+) ở góc trên bên phải
3. **Xem công việc**: Chọn chế độ xem (Ngày/Tuần/Tháng) và chọn ngày trên lịch
4. **Hoàn thành công việc**: Nhấn vào checkbox hoặc công việc để đánh dấu hoàn thành
5. **Đổi theme**: Nhấn vào icon mặt trăng/mặt trời ở header

## 🏗️ Cấu trúc dự án

```
FocusDay/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js          # Cấu hình MongoDB
│   │   ├── controllers/
│   │   │   └── taskController.js  # Logic xử lý tasks
│   │   ├── models/
│   │   │   └── Task.js        # Schema Task
│   │   ├── routes/
│   │   │   └── tasks.js       # API routes
│   │   └── index.js          # Entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js       # Axios instance
    │   ├── context/
    │   │   ├── AuthContext.js # Quản lý authentication
    │   │   └── ThemeContext.js # Quản lý theme
    │   └── screens/
    │       ├── HomeScreen.js  # Màn hình chính
    │       └── AddTaskScreen.js # Màn hình thêm task
    └── package.json
```

## 🔌 API Endpoints

- `GET /api/tasks?userId=xxx` - Lấy danh sách tasks
- `POST /api/tasks` - Tạo task mới
- `PUT /api/tasks/:id` - Cập nhật task
- `DELETE /api/tasks/:id` - Xóa task

## 📝 Ghi chú

- Backend API hiện đang sử dụng `userId` từ query params/body. Trong tương lai sẽ được thay thế bằng JWT authentication.
- Frontend sử dụng `user.email` làm `userId` tạm thời.
- Để chạy trên thiết bị thật, cần thay đổi `API_URL` trong `frontend/src/api/axios.js` thành IP của máy tính.

## 🐛 Xử lý lỗi

- Nếu MongoDB không kết nối được, kiểm tra `MONGO_URL` trong file `.env`
- Nếu API không hoạt động, kiểm tra port và địa chỉ IP trong `axios.js`
- Nếu Google OAuth không hoạt động, kiểm tra các biến môi trường `EXPO_PUBLIC_GOOGLE_*`

## 📄 License

MIT

