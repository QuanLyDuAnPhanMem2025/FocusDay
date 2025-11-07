import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Easing,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { user, isAuthenticating, signInWithGoogle, signOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'
  const [refreshing, setRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // Để control việc render drawer
  
  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  
  // Dữ liệu mẫu - sau này sẽ lấy từ backend
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Họp với team',
      time: '09:00',
      date: new Date().toISOString().split('T')[0],
      type: 'meeting',
      completed: false,
    },
    {
      id: '2',
      title: 'Review code',
      time: '14:00',
      date: new Date().toISOString().split('T')[0],
      type: 'work',
      completed: false,
    },
    {
      id: '3',
      title: 'Gym',
      time: '18:00',
      date: new Date().toISOString().split('T')[0],
      type: 'personal',
      completed: false,
    },
    {
      id: '4',
      title: 'Meeting với client',
      time: '10:00',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Ngày mai
      type: 'meeting',
      completed: false,
    },
    {
      id: '5',
      title: 'Làm báo cáo',
      time: '15:00',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      type: 'work',
      completed: false,
    },
  ]);

  const userName = user?.name || 'Người dùng';
  const userEmail = user?.email || 'Đăng nhập để đồng bộ dữ liệu';
  const greetingText = user?.name
    ? `Xin chào, ${user.name.split(' ')[0]}!`
    : 'Xin chào!';

  const handleAuthPress = () => {
    console.log('[UI] Google button pressed', { hasUser: !!user });
    if (user) {
      signOut();
    } else {
      signInWithGoogle();
    }
  };

  // Lấy các ngày trong tuần
  const getWeekDates = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Thứ 2 là ngày đầu tuần
    const monday = new Date(date);
    monday.setDate(diff);
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDates.push(d.toISOString().split('T')[0]);
    }
    return weekDates;
  };

  // Lấy các ngày trong tháng
  const getMonthDates = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const monthDates = [];
    const currentDate = new Date(firstDay);
    while (currentDate <= lastDay) {
      monthDates.push(new Date(currentDate).toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return monthDates;
  };

  // Lọc tasks theo view mode
  const getFilteredTasks = () => {
    if (viewMode === 'day') {
      return tasks.filter(task => task.date === selectedDate);
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates(selectedDate);
      return tasks.filter(task => weekDates.includes(task.date));
    } else {
      const monthDates = getMonthDates(selectedDate);
      return tasks.filter(task => monthDates.includes(task.date));
    }
  };

  // Đánh dấu các ngày có công việc
  const markedDates = {};
  tasks.forEach(task => {
    if (!markedDates[task.date]) {
      markedDates[task.date] = { marked: true, dotColor: '#6366f1' };
    }
  });
  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: '#6366f1',
  };

  const getTaskIcon = (type) => {
    switch (type) {
      case 'meeting':
        return 'people';
      case 'work':
        return 'briefcase';
      case 'personal':
        return 'person';
      default:
        return 'calendar';
    }
  };

  const getTaskColor = (type) => {
    switch (type) {
      case 'meeting':
        return '#3b82f6';
      case 'work':
        return '#10b981';
      case 'personal':
        return '#f59e0b';
      default:
        return '#6366f1';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (viewMode === 'day') {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('vi-VN', options);
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates(dateString);
      const startDate = new Date(weekDates[0]);
      const endDate = new Date(weekDates[6]);
      const start = startDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
      const end = endDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
      return `${start} - ${end}`;
    } else {
      const options = { month: 'long', year: 'numeric' };
      return date.toLocaleDateString('vi-VN', options);
    }
  };

  const getSectionTitle = () => {
    if (viewMode === 'day') {
      return 'Công việc hôm nay';
    } else if (viewMode === 'week') {
      return 'Công việc trong tuần';
    } else {
      return 'Công việc trong tháng';
    }
  };

  const toggleTaskComplete = (taskId) => {
    // Smooth animation khi toggle
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleViewModeChange = (mode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode(mode);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh - sau này sẽ gọi API
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Fade in animation khi component mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  // Menu drawer animations với spring mượt hơn
  useEffect(() => {
    if (isMenuOpen) {
      setShowMenu(true); // Hiển thị drawer trước khi animate
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -300,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start((finished) => {
        if (finished) {
          // Ẩn drawer sau khi animation hoàn thành
          setShowMenu(false);
        }
      });
    }
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Custom stylesheet cho calendar để hỗ trợ dark mode
  const calendarTheme = {
    backgroundColor: colors.surface,
    calendarBackground: colors.surface,
    textSectionTitleColor: colors.textSecondary,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: '#ffffff',
    todayTextColor: colors.primary,
    dayTextColor: colors.text,
    textDisabledColor: colors.textTertiary,
    dotColor: colors.primary,
    selectedDotColor: '#ffffff',
    arrowColor: colors.primary,
    monthTextColor: colors.text,
    indicatorColor: colors.primary,
    textDayHeaderFontColor: colors.textSecondary,
    textDayFontWeight: '500',
    textMonthFontWeight: 'bold',
    textDayHeaderFontWeight: '600',
    textDayFontSize: 14,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 13,
    disabledDayTextColor: colors.textTertiary,
    reservationColor: colors.surface,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.surface} />
      
      {/* Logo Header */}
      <View style={[styles.logoHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={toggleMenu} style={styles.menuButton} activeOpacity={0.7}>
          <Ionicons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.logoText, { color: colors.primary, flex: 1 }]}>FocusDay</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle} activeOpacity={0.7}>
          <Ionicons 
            name={isDarkMode ? "sunny" : "moon"} 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>
      </View>

      {/* Menu Drawer */}
      {showMenu && (
        <Animated.View
          style={[
            styles.menuDrawer,
            {
              backgroundColor: colors.surface,
              transform: [{ translateX: slideAnim }],
            },
          ]}
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
        >
        <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuCloseButton}
            onPress={closeMenu}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={[styles.menuUserIcon, { backgroundColor: colors.primaryLight }]}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.menuUserImage} />
            ) : (
              <Ionicons name="person" size={32} color={colors.primary} />
            )}
          </View>
          <Text style={[styles.menuUserName, { color: colors.text }]}>{userName}</Text>
          <Text style={[styles.menuUserEmail, { color: colors.textSecondary }]}>{userEmail}</Text>
        </View>

        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

        <View style={styles.menuItems}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => {
              closeMenu();
              // Navigate to profile/info
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Thông tin cá nhân</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => {
              closeMenu();
              // Navigate to settings
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: colors.blueLight }]}>
              <Ionicons name="settings-outline" size={20} color={colors.blueIcon} />
            </View>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Cài đặt</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => {
              closeMenu();
              // Navigate to help
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: colors.yellowLight }]}>
              <Ionicons name="help-circle-outline" size={20} color={colors.yellowIcon} />
            </View>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Trợ giúp</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuAuthItem]}
            onPress={() => {
              closeMenu();
              handleAuthPress();
            }}
            activeOpacity={0.7}
            disabled={isAuthenticating}
          >
            <View
              style={[
                styles.menuItemIcon,
                user
                  ? { backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2' }
                  : { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons
                name={user ? 'log-out-outline' : 'logo-google'}
                size={20}
                color={user ? '#ef4444' : colors.primary}
              />
            </View>
            <View style={styles.menuAuthContent}>
              <Text
                style={[
                  styles.menuItemText,
                  user ? { color: '#ef4444' } : { color: colors.text },
                ]}
              >
                {user ? 'Đăng xuất' : 'Đăng nhập Google'}
              </Text>
              {!user && (
                <Text style={[styles.menuItemHint, { color: colors.textSecondary }]}>
                  Đăng nhập để đồng bộ lịch làm việc của bạn
                </Text>
              )}
            </View>
            {isAuthenticating ? (
              <ActivityIndicator size="small" color={user ? '#ef4444' : colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        </View>
        </Animated.View>
      )}

      {/* Menu Overlay Background - Che toàn bộ màn hình */}
      {isMenuOpen && (
        <Animated.View
          style={[
            styles.overlayBackgroundFull,
            { opacity: overlayAnim },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Menu Overlay Touchable - Chỉ ở phần bên phải */}
      {isMenuOpen && (
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={closeMenu}
          />
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>{greetingText}</Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(selectedDate)}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
        {/* View Mode Selector */}
        <View style={[styles.viewModeContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'day' && { backgroundColor: colors.primary }]}
            onPress={() => handleViewModeChange('day')}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewModeText, { color: viewMode === 'day' ? '#ffffff' : colors.textSecondary }]}>
              Ngày
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'week' && { backgroundColor: colors.primary }]}
            onPress={() => handleViewModeChange('week')}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewModeText, { color: viewMode === 'week' ? '#ffffff' : colors.textSecondary }]}>
              Tuần
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'month' && { backgroundColor: colors.primary }]}
            onPress={() => handleViewModeChange('month')}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewModeText, { color: viewMode === 'month' ? '#ffffff' : colors.textSecondary }]}>
              Tháng
            </Text>
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <View style={[styles.calendarContainer, { backgroundColor: colors.surface }]}>
          <Calendar
            key={`calendar-${isDarkMode}`}
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            hideExtraDays={viewMode === 'day'}
            theme={calendarTheme}
            style={[styles.calendar, { backgroundColor: colors.surface }]}
            markingType="simple"
          />
        </View>

        {/* Stats Section */}
        {getFilteredTasks().length > 0 && (
          <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.greenLight }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.greenIcon} />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {getFilteredTasks().filter(t => t.completed).length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hoàn thành</Text>
              </View>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.blueLight }]}>
                <Ionicons name="time" size={20} color={colors.blueIcon} />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {getFilteredTasks().length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tổng cộng</Text>
              </View>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.yellowLight }]}>
                <Ionicons name="hourglass" size={20} color={colors.yellowIcon} />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {getFilteredTasks().filter(t => !t.completed).length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Còn lại</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tasks Section */}
        <View style={styles.tasksSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{getSectionTitle()}</Text>
            <Text style={[styles.taskCount, { color: colors.textSecondary }]}>{getFilteredTasks().length} công việc</Text>
          </View>

          {getFilteredTasks().length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={colors.emptyIcon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Không có công việc nào</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Nhấn nút + để thêm công việc mới</Text>
            </View>
          ) : (
            getFilteredTasks()
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.taskItem,
                  { backgroundColor: colors.surface },
                  task.completed && styles.taskItemCompleted,
                ]}
                onPress={() => toggleTaskComplete(task.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.taskIcon, { backgroundColor: getTaskColor(task.type) + '20' }]}>
                  <Ionicons
                    name={getTaskIcon(task.type)}
                    size={20}
                    color={getTaskColor(task.type)}
                  />
                </View>
                <View style={styles.taskContent}>
                  <Text
                    style={[
                      styles.taskTitle,
                      { color: colors.text },
                      task.completed && { color: colors.textTertiary },
                    ]}
                  >
                    {task.title}
                  </Text>
                  <View style={styles.taskMeta}>
                    {(viewMode === 'week' || viewMode === 'month') && (
                      <Text style={[styles.taskDate, { color: colors.textSecondary }]}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />{' '}
                        {new Date(task.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })}
                      </Text>
                    )}
                    <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
                      <Ionicons name="time-outline" size={14} color={colors.textSecondary} /> {task.time}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    { borderColor: colors.border },
                    task.completed && styles.checkboxCompleted,
                  ]}
                  onPress={() => toggleTaskComplete(task.id)}
                >
                  {task.completed && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* AI Optimization Card */}
        <TouchableOpacity style={[styles.aiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.aiCardContent}>
            <View style={[styles.aiIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="sparkles" size={24} color={colors.primary} />
            </View>
            <View style={styles.aiText}>
              <Text style={[styles.aiTitle, { color: colors.text }]}>Tối ưu hóa lịch với AI</Text>
              <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                Để AI sắp xếp lại lịch làm việc của bạn
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  logoHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackgroundFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 280, // Bắt đầu từ bên phải drawer
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuDrawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    zIndex: 1001,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuHeader: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    position: 'relative',
  },
  menuCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1002,
    elevation: 7,
  },
  menuUserIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuUserImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  menuUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  menuUserEmail: {
    fontSize: 14,
  },
  menuDivider: {
    height: 1,
    marginVertical: 8,
  },
  menuItems: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuAuthItem: {
    alignItems: 'center',
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  menuAuthContent: {
    flex: 1,
    marginRight: 8,
  },
  menuItemHint: {
    fontSize: 12,
    marginTop: 2,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flex: 1,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#6366f1',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  viewModeTextActive: {
    color: '#ffffff',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendar: {
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 8,
  },
  tasksSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  taskCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  taskItemCompleted: {
    opacity: 0.6,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  taskDate: {
    fontSize: 12,
    color: '#6b7280',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  taskTime: {
    fontSize: 13,
    color: '#6b7280',
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  aiCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  aiCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiText: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  aiSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
});

