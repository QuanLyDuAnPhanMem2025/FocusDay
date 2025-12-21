# FocusDay - Ứng dụng Quản lý Công việc

Ứng dụng quản lý công việc và lịch trình cá nhân với React Native (Expo) và Node.js (Express) + MongoDB.

## Tính năng

- Quản lý công việc theo ngày/tuần/tháng
- Lịch tương tác với đánh dấu ngày có công việc
- Dark/Light mode
- Đăng nhập Google OAuth
- Thống kê công việc (hoàn thành/tổng cộng/còn lại)
- Hỗ trợ đa nền tảng (Android, iOS, Web)

## Yêu cầu

- Node.js (khuyến nghị >= 18)
- MongoDB (local hoặc MongoDB Atlas)
- Expo CLI (được cài kèm khi dùng `npx expo`)
- Google OAuth credentials (cho đăng nhập)

## Cài đặt

### Backend

1. Cài đặt dependencies:
```bash
cd backend
npm install
```

2. Tạo file `.env` trong thư mục `backend`:
```env
MONGO_URL=mongodb://localhost:27017/focusday
PORT=4000
```

Lưu ý: Không commit file `.env` lên Git.

3. Khởi chạy server:
```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:4000`

### Frontend

1. Cài đặt dependencies:
```bash
cd frontend
npm install
```

2. Tạo file `.env` trong thư mục `frontend`:
```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
EXPO_PUBLIC_API_PORT=4000
```

Lưu ý: Không commit file `.env` lên Git.

3. Khởi chạy ứng dụng:
```bash
npm start
```

Mẹo:
- Android Emulator: đảm bảo backend chạy với port trùng `EXPO_PUBLIC_API_PORT`. Ứng dụng sẽ tự dùng `10.0.2.2` để gọi về máy host.
- Thiết bị thật: cần cấu hình `EXPO_PUBLIC_API_URL` (trong `.env` của frontend) trỏ tới IP LAN của máy chạy backend.

## Sử dụng

1. Đăng nhập: mở menu và chọn "Đăng nhập Google"
2. Thêm công việc: nhấn nút thêm
3. Xem công việc: chọn chế độ xem (Ngày/Tuần/Tháng) và chọn ngày trên lịch
4. Hoàn thành công việc: đánh dấu hoàn thành và theo dõi thống kê
5. Đổi theme: chuyển Light/Dark mode

## Cấu trúc dự án

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
│   │   │   ├── tasks.js       # API routes
│   │   │   └── users.js       # API routes
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

## API Endpoints

- `GET /api/tasks?userId=xxx` - Lấy danh sách tasks
- `POST /api/tasks` - Tạo task mới
- `PUT /api/tasks/:id` - Cập nhật task
- `DELETE /api/tasks/:id` - Xóa task

## Ghi chú

- Backend API hiện đang lọc dữ liệu theo thông tin user truyền từ client.
- Để chạy trên thiết bị thật, nên đặt `EXPO_PUBLIC_API_URL` trong `.env` của frontend để trỏ tới IP LAN của máy chạy backend.

## Xử lý lỗi

- Nếu MongoDB không kết nối được, kiểm tra `MONGO_URL` trong file `.env`
- Nếu API không hoạt động, kiểm tra port và địa chỉ IP trong `axios.js`
- Nếu Google OAuth không hoạt động, kiểm tra các biến môi trường `EXPO_PUBLIC_GOOGLE_*`

## License

MIT

