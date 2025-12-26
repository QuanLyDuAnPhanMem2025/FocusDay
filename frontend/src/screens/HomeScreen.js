import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Animated,
  Easing,
  Platform,
  UIManager,
  LayoutAnimation,
  Modal,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { user, isAuthenticating, signInWithGoogle, signOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // Để control việc render drawer
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  
  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const normalizeTaskFromApi = useCallback((task) => {
    const dueDateValue = task?.dueDate || task?.date;
    let normalizedDate = task?.date || '';
    if (dueDateValue) {
      // Nếu là Date object hoặc ISO string, parse và format thành YYYY-MM-DD
      const parsed = new Date(dueDateValue);
      if (!Number.isNaN(parsed.getTime())) {
        // Dùng UTC để tránh timezone issues
        const year = parsed.getUTCFullYear();
        const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const day = String(parsed.getUTCDate()).padStart(2, '0');
        normalizedDate = `${year}-${month}-${day}`;
      }
    }
    return {
      ...task,
      dueDate: dueDateValue,
      date: normalizedDate,
    };
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      return;
    }
    if (!user._id) {
      setTasks([]);
      return;
    }
    setIsLoading(true);
    try {
      // Backend đang mong đợi userId (Mongo ObjectId) trong query params
      const response = await api.get('/tasks', {
        params: { userId: user._id },
      });
      // MongoDB sử dụng _id, chúng ta cần map nó tới id nếu cần, hoặc dùng _id trực tiếp
      console.log(`[HomeScreen] Fetched ${response.data.length} tasks for user: ${user._id}`);
      const normalizedTasks = response.data.map(normalizeTaskFromApi);
      setTasks(normalizedTasks);
    } catch (error) {
      console.error('Fetch tasks error:', error.response?.data || error.message);
      console.error('Full error:', error);
      // Chỉ hiển thị alert nếu không phải là lỗi network tạm thời
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNABORTED') {
        Alert.alert('Lỗi', 'Không thể tải danh sách công việc.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, normalizeTaskFromApi]);

  // Fetch tasks khi component mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Fetch tasks lại khi màn hình được focus (ví dụ: quay lại từ AddTaskScreen)
  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

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

  const getTaskTypeLabel = (type) => {
    switch (type) {
      case 'meeting':
        return 'Cuộc họp';
      case 'work':
        return 'Công việc';
      case 'personal':
        return 'Cá nhân';
      default:
        return 'Mục chung';
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

  const parseTimeToMinutes = useCallback((timeString) => {
    if (!timeString) return null;
    const [hoursStr, minutesStr] = timeString.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }
    return hours * 60 + minutes;
  }, []);

  const formatMinutesToLabel = useCallback((totalMinutes) => {
    if (typeof totalMinutes !== 'number') {
      return '09:00';
    }
    const normalized = Math.max(0, totalMinutes);
    const hours = Math.floor(normalized / 60) % 24;
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }, []);

  const formatTimeRange = useCallback(
    (startMinutes = 540, duration = 60) => {
      const safeStart = Math.max(0, startMinutes);
      const end = safeStart + duration;
      return `${formatMinutesToLabel(safeStart)} - ${formatMinutesToLabel(end)}`;
    },
    [formatMinutesToLabel]
  );

  const buildAiInsights = useCallback(() => {
    const tasksForDate = tasks.filter((task) => task.date === selectedDate);
    const pendingTasks = tasksForDate.filter((task) => !task.completed);
    const typePriority = {
      meeting: 4,
      work: 3,
      personal: 2,
      default: 1,
    };

    const scoredPending = pendingTasks
      .map((task) => {
        const timeValue = parseTimeToMinutes(task.time);
        const base = typePriority[task.type] || 1;
        const noteBonus = task.notes?.length > 40 ? 0.2 : 0;
        return {
          task,
          timeValue,
          score: base + noteBonus + (timeValue !== null ? 1.5 : 0),
        };
      })
      .sort((a, b) => {
        if (a.timeValue !== null && b.timeValue !== null) {
          return a.timeValue - b.timeValue;
        }
        if (a.timeValue !== null) return -1;
        if (b.timeValue !== null) return 1;
        return b.score - a.score;
      });

    const focusBlocks = scoredPending.slice(0, 3).map((entry, index) => {
      let startMinutes = entry.timeValue;
      if (startMinutes === null) {
        startMinutes = 9 * 60 + index * 90;
      }
      return {
        id: entry.task._id || `${entry.task.title}-${index}`,
        title: entry.task.title,
        typeLabel: getTaskTypeLabel(entry.task.type),
        range: formatTimeRange(startMinutes),
      };
    });

    const quickWins = pendingTasks
      .filter((task) => (task.notes?.length || 0) < 60 && task.type !== 'meeting')
      .slice(0, 2)
      .map((task) => ({
        id: task._id,
        title: task.title,
        reason: task.time ? `Có lịch cụ thể lúc ${task.time}` : 'Không cần chuẩn bị nhiều',
      }));

    const upcoming = tasks
      .filter((task) => Boolean(task.date) && !task.completed && task.date > selectedDate)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 3)
      .map((task) => {
        // Parse date string đúng cách để tránh timezone issues
        const [year, month, day] = task.date.split('-').map(Number);
        const taskDate = new Date(year, month - 1, day);
        return {
          id: task._id,
          title: task.title,
          dateLabel: taskDate.toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: 'numeric',
            month: 'numeric',
          }),
        };
      });

    const total = tasksForDate.length;
    const pendingCount = pendingTasks.length;
    const completedCount = total - pendingCount;
    const utilization = total ? Math.round((completedCount / total) * 100) : 0;
    const confidence = Math.min(95, Math.max(45, 60 + completedCount * 10 - pendingCount * 5));

    const nextFocusTitle = focusBlocks[0]?.title || pendingTasks[0]?.title;
    const nextFocusTime = focusBlocks[0]?.range?.split(' - ')[0] || '09:00';

    const summary =
      total === 0
        ? 'Chưa có công việc nào cho ngày này. AI gợi ý bạn dành thời gian lên kế hoạch hoặc nghỉ ngơi.'
        : pendingCount === 0
        ? 'Bạn đã hoàn thành mọi nhiệm vụ hôm nay. Dùng thời gian rảnh để xem lại mục tiêu tuần.'
        : `Bạn còn ${pendingCount} nhiệm vụ. Bắt đầu với "${nextFocusTitle}" vào lúc ${nextFocusTime} để giữ nhịp làm việc.`;

    const energyTip =
      pendingCount === 0
        ? 'Dành 15 phút tổng kết và chuẩn bị cho ngày mai.'
        : pendingCount > 3
        ? 'Chia các khối công việc thành 60 phút và xen kẽ 5 phút nghỉ để giữ năng lượng.'
        : 'Tập trung dứt điểm từng mục trong 25 phút để giải phóng tâm trí.';

    // Tính toán năng suất tuần
    const weekDates = getWeekDates(selectedDate);
    const weekTasks = tasks.filter(t => weekDates.includes(t.date));
    const weekCompleted = weekTasks.filter(t => t.completed).length;
    const weekTotal = weekTasks.length;
    const weekProductivity = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

    // Phân tích thời gian làm việc
    const tasksWithTime = tasksForDate.filter(t => t.time);
    const timeDistribution = tasksWithTime.map(t => {
      const timeValue = parseTimeToMinutes(t.time);
      return { task: t, time: timeValue };
    }).sort((a, b) => a.time - b.time);

    // Gợi ý sắp xếp thời gian thông minh
    const timeSuggestions = [];
    if (timeDistribution.length > 0) {
      for (let i = 0; i < timeDistribution.length - 1; i++) {
        const current = timeDistribution[i];
        const next = timeDistribution[i + 1];
        const gap = next.time - current.time;
        if (gap < 30) {
          timeSuggestions.push({
            task1: current.task.title,
            task2: next.task.title,
            suggestion: `Khoảng cách giữa "${current.task.title}" và "${next.task.title}" chỉ ${gap} phút. Cân nhắc điều chỉnh thời gian để có thời gian nghỉ.`,
          });
        }
      }
    }

    // Phân tích loại công việc
    const typeAnalysis = {};
    tasksForDate.forEach(task => {
      if (!typeAnalysis[task.type]) {
        typeAnalysis[task.type] = { total: 0, completed: 0 };
      }
      typeAnalysis[task.type].total++;
      if (task.completed) {
        typeAnalysis[task.type].completed++;
      }
    });

    const typeInsights = Object.entries(typeAnalysis).map(([type, data]) => {
      const completionRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
      return {
        type: getTaskTypeLabel(type),
        total: data.total,
        completed: data.completed,
        rate: completionRate,
        tip: completionRate < 50 
          ? `Bạn đang hoàn thành ${completionRate}% ${getTaskTypeLabel(type)}. Hãy tập trung hơn vào loại này.`
          : `Tuyệt vời! Bạn đã hoàn thành ${completionRate}% ${getTaskTypeLabel(type)}.`,
      };
    });

    // Gợi ý ưu tiên thông minh
    const prioritySuggestions = [];
    if (pendingTasks.length > 0) {
      const highPriority = pendingTasks.filter(t => t.type === 'meeting' || t.type === 'work');
      if (highPriority.length > 0) {
        prioritySuggestions.push({
          title: 'Ưu tiên công việc quan trọng',
          tasks: highPriority.slice(0, 3).map(t => t.title),
          reason: 'Các công việc này có mức độ ưu tiên cao, nên hoàn thành trước.',
        });
      }
    }

    // Phân tích xu hướng
    const allTasks = tasks.filter(t => t.date && !t.date.startsWith('1970')); // Loại bỏ invalid dates
    const completedTasks = allTasks.filter(t => t.completed);
    const overallCompletionRate = allTasks.length > 0 
      ? Math.round((completedTasks.length / allTasks.length) * 100) 
      : 0;

    // Gợi ý cải thiện
    const improvementTips = [];
    if (overallCompletionRate < 50) {
      improvementTips.push('Tỷ lệ hoàn thành của bạn đang thấp. Hãy đặt mục tiêu nhỏ hơn và tập trung vào từng nhiệm vụ.');
    } else if (overallCompletionRate < 70) {
      improvementTips.push('Bạn đang làm tốt! Hãy tiếp tục duy trì nhịp độ này.');
    } else {
      improvementTips.push('Xuất sắc! Bạn đang quản lý thời gian rất hiệu quả. Hãy tiếp tục phát huy!');
    }

    if (pendingCount > 5) {
      improvementTips.push('Bạn có quá nhiều công việc chưa hoàn thành. Hãy xem xét hoãn hoặc ủy thác một số nhiệm vụ.');
    }

    // Thống kê thời gian
    const timeStats = {
      totalTasksWithTime: tasksWithTime.length,
      earliestTask: timeDistribution[0]?.task?.title || null,
      latestTask: timeDistribution[timeDistribution.length - 1]?.task?.title || null,
      averageTasksPerDay: weekTotal > 0 ? Math.round((weekTotal / 7) * 10) / 10 : 0,
    };

    return {
      summary,
      stats: { total, pending: pendingCount, completed: completedCount },
      focusBlocks,
      quickWins,
      upcoming,
      utilization,
      confidence,
      energyTip,
      // New features
      weekProductivity,
      timeSuggestions,
      typeInsights,
      prioritySuggestions,
      overallCompletionRate,
      improvementTips,
      timeStats,
    };
  }, [tasks, selectedDate, parseTimeToMinutes, formatTimeRange, getTaskTypeLabel]);

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
      markedDates[task.date] = { marked: true, dotColor: colors.primary };
    }
  });
  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: colors.primary,
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
        return '#77BEF0';
      case 'work':
        return '#10b981';
      case 'personal':
        return '#FFDE63';
      default:
        return colors.primary;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Parse date string (YYYY-MM-DD) thành year, month, day để tránh timezone issues
    let dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    if ([year, month, day].some((part) => Number.isNaN(part))) {
      return '';
    }
    // Tạo Date object từ local time (month - 1 vì Date month bắt đầu từ 0)
    const date = new Date(year, month - 1, day);
    
    if (viewMode === 'day') {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('vi-VN', options);
    } else if (viewMode === 'week') {
      const weekDates = getWeekDates(dateString);
      // Parse week dates đúng cách
      const parseWeekDate = (dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      };
      const startDate = parseWeekDate(weekDates[0]);
      const endDate = parseWeekDate(weekDates[6]);
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

  const toggleTaskComplete = async (taskId) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task) return;

    const updatedTask = { ...task, completed: !task.completed };

    // Optimistic UI update
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTasks(tasks.map(t => (t._id === taskId ? updatedTask : t)));

    try {
      await api.put(`/tasks/${taskId}`, { completed: updatedTask.completed });
    } catch (error) {
      // Revert on error
      Alert.alert('Lỗi', 'Không thể cập nhật công việc.');
      console.error('Update task error:', error);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTasks(tasks.map(t => (t._id === taskId ? task : t)));
    }
  };

  const handleDeleteTask = async (taskId) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task) return;

    Alert.alert(
      'Xóa công việc',
      `Bạn có chắc chắn muốn xóa "${task.title}"?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/tasks/${taskId}`);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setTasks(tasks.filter(t => t._id !== taskId));
            } catch (error) {
              console.error('Delete task error:', error);
              Alert.alert('Lỗi', 'Không thể xóa công việc. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleTaskPress = (task) => {
    const taskId = task?._id;
    navigation.navigate('TaskDetail', {
      task,
      onTaskUpdated: (updatedTask) => {
        const normalizedTask = normalizeTaskFromApi(updatedTask);
        setTasks(prevTasks => prevTasks.map(t => (t._id === normalizedTask._id ? normalizedTask : t)));
      },
      onTaskDeleted: () => {
        setTasks(prevTasks => prevTasks.filter(t => t._id !== taskId));
      },
    });
  };

  const handleOptimizeSchedule = useCallback(async () => {
    if (!user) {
      Alert.alert('Cần đăng nhập', 'Hãy đăng nhập để AI có thể phân tích công việc của bạn.');
      return;
    }

    if (!tasks.length) {
      Alert.alert('Chưa có dữ liệu', 'Bạn cần thêm ít nhất một công việc để AI tối ưu hóa lịch.');
      return;
    }

    setIsGeneratingAi(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const insights = buildAiInsights();
      setAiInsights(insights);
      setIsAiModalVisible(true);
    } catch (error) {
      console.error('AI optimization error', error);
      Alert.alert('Lỗi', 'Không thể tạo gợi ý AI. Vui lòng thử lại sau.');
    } finally {
      setIsGeneratingAi(false);
    }
  }, [user, tasks.length, buildAiInsights]);

  const closeAiModal = () => {
    setIsAiModalVisible(false);
  };

  const handleViewModeChange = (mode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode(mode);
  };

  const onRefresh = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

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

  const renderTasks = () => {
    const filteredTasks = getFilteredTasks();

    if (isLoading && tasks.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Đang tải công việc...</Text>
        </View>
      );
    }

    if (!user) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={64} color={colors.emptyIcon} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Vui lòng đăng nhập</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Đăng nhập để xem và quản lý công việc của bạn.</Text>
        </View>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color={colors.emptyIcon} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Không có công việc nào</Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Nhấn nút + để thêm công việc mới</Text>
        </View>
      );
    }

    return filteredTasks
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
      .map((task) => {
        const renderRightActions = (progress, dragX) => {
          const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
          });

          return (
            <TouchableOpacity
              style={[styles.deleteAction, { backgroundColor: '#ef4444' }]}
              onPress={() => handleDeleteTask(task._id)}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale }] }}>
                <Ionicons name="trash" size={24} color="#fff" />
                <Text style={styles.deleteActionText}>Xóa</Text>
              </Animated.View>
            </TouchableOpacity>
          );
        };

        const taskItem = (
          <TouchableOpacity
            style={[
              styles.taskItem,
              { backgroundColor: colors.surface },
              task.completed && styles.taskItemCompleted,
            ]}
            onPress={() => handleTaskPress(task)}
            activeOpacity={0.7}
          >
              <View style={[styles.taskIcon, { backgroundColor: getTaskColor(task.type) }]}>
                <Ionicons
                  name={getTaskIcon(task.type)}
                  size={20}
                  color="#ffffff"
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
                      {(() => {
                        // Parse date string đúng cách để tránh timezone issues
                        const [year, month, day] = task.date.split('-').map(Number);
                        const taskDate = new Date(year, month - 1, day);
                        return taskDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
                      })()}
                    </Text>
                  )}
                  <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} /> {task.time || 'Linh hoạt'}
                  </Text>
                  {task.durationMinutes && (
                    <Text style={[styles.taskDuration, { color: colors.textSecondary, marginLeft: 5 }]}>
                      {task.allDay ? 'Cả ngày' : `${task.durationMinutes} phút`}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  task.completed && styles.checkboxCompleted,
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleTaskComplete(task._id);
                }}
              >
                {task.completed && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
        );

        // Trên web, không dùng Swipeable (không hỗ trợ tốt)
        // Trên web, người dùng có thể xóa từ task detail screen
        if (Platform.OS === 'web') {
          return (
            <View key={task._id}>
              {taskItem}
            </View>
          );
        }

        // Trên mobile, dùng Swipeable
        return (
          <Swipeable
            key={task._id}
            renderRightActions={renderRightActions}
            rightThreshold={40}
          >
            {taskItem}
          </Swipeable>
        );
      });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.surface} />

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
        <View style={styles.menuHeader}>
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

        <View style={styles.menuItems}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              closeMenu();
              // Navigate to profile/info
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: '#57595B' }]}>
              <Ionicons name="person-outline" size={20} color="#ffffff" />
            </View>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Thông tin cá nhân</Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#ffffff' : colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              closeMenu();
              // Navigate to settings
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: '#6D94C5' }]}>
              <Ionicons name="settings-outline" size={20} color="#ffffff" />
            </View>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Cài đặt</Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#ffffff' : colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              closeMenu();
              // Navigate to help
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: '#FCB53B' }]}>
              <Ionicons name="help-circle-outline" size={20} color="#ffffff" />
            </View>
            <Text style={[styles.menuItemText, { color: colors.text }]}>Trợ giúp</Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#ffffff' : colors.primary} />
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
                  ? { backgroundColor: '#FF3838' }
                  : { backgroundColor: '#ffffff' },
              ]}
            >
              {user ? (
                <Ionicons name="log-out-outline" size={20} color="#ffffff" />
              ) : (
                <Image
                  source={{
                    uri: 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
                  }}
                  style={{ width: 20, height: 20 }}
                  resizeMode="contain"
                />
              )}
            </View>
            {user ? (
              <Text style={[styles.menuItemText, { color: '#FF3838' }]}>
                Đăng xuất
              </Text>
            ) : (
              <View style={styles.menuAuthContent}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>Đăng nhập Google</Text>
                <Text style={[styles.menuItemHint, { color: colors.textSecondary }]}>
                  Đăng nhập để đồng bộ lịch làm việc của bạn
                </Text>
              </View>
            )}
            {isAuthenticating ? (
              <ActivityIndicator size="small" color={user ? '#ef4444' : colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#ffffff' : colors.primary} />
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

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
        {/* Logo Header (sticky) */}
        <View style={[styles.logoHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.logoSideLeft}>
            <TouchableOpacity onPress={toggleMenu} style={styles.menuButton} activeOpacity={0.7}>
              <Ionicons name="menu" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.logoTitleContainer}>
            <Text style={[styles.logoText, { color: isDarkMode ? colors.text : colors.primary }]} numberOfLines={1}>
              FocusDay
            </Text>
          </View>

          <View style={styles.logoSideRight}>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle} activeOpacity={0.7}>
              <Ionicons
                name={isDarkMode ? "sunny" : "moon"}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.greeting, { color: isDarkMode ? colors.text : colors.primary }]}>{greetingText}</Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(selectedDate)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('AddTask', {
                date: selectedDate,
              })
            }
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

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
              <View style={[styles.statIcon, { backgroundColor: '#78C841' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
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
              <View style={[styles.statIcon, { backgroundColor: '#113F67' }]}>
                <Ionicons name="time" size={20} color="#ffffff" />
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
              <View style={[styles.statIcon, { backgroundColor: '#E37434' }]}>
                <Ionicons name="hourglass" size={20} color="#ffffff" />
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
          {renderTasks()}
        </View>

        {/* AI Optimization Card */}
        <TouchableOpacity
          style={[
            styles.aiCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: isGeneratingAi ? 0.7 : 1,
            },
          ]}
          activeOpacity={0.9}
          onPress={handleOptimizeSchedule}
          disabled={isGeneratingAi}
        >
          <View style={styles.aiCardContent}>
            <View style={[styles.aiIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="sparkles" size={24} color={isDarkMode ? '#ffffff' : colors.primary} />
            </View>
            <View style={styles.aiText}>
              <Text style={[styles.aiTitle, { color: colors.text }]}>Tối ưu hóa lịch với AI</Text>
              <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                Nhấn để AI đề xuất block tập trung và thứ tự ưu tiên
              </Text>
            </View>
            {isGeneratingAi ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            )}
          </View>
        </TouchableOpacity>
        </ScrollView>
      </Animated.View>
      <Modal
        visible={isAiModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeAiModal}
      >
        <View style={styles.aiModalOverlay}>
          <View style={[styles.aiModalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.aiModalHeader}>
              <Text style={[styles.aiModalTitle, { color: colors.text }]}>
                Gợi ý AI cho {formatDate(selectedDate)}
              </Text>
              <TouchableOpacity style={styles.aiModalClose} onPress={closeAiModal}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            {aiInsights ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.aiModalSummary, { color: colors.textSecondary }]}>
                  {aiInsights.summary}
                </Text>
                <View style={styles.aiConfidenceRow}>
                  <Text style={[styles.aiConfidenceLabel, { color: colors.textSecondary }]}>
                    Độ tin cậy khoảng {aiInsights.confidence}%
                  </Text>
                  <View style={[styles.aiConfidenceBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.aiConfidenceValue,
                        { backgroundColor: colors.primary, width: `${aiInsights.confidence}%` },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.aiStatRow}>
                  <View style={[styles.aiStatItem, { borderColor: colors.border }]}>
                    <Text style={[styles.aiStatValue, { color: colors.text }]}>
                      {aiInsights.stats.total}
                    </Text>
                    <Text style={[styles.aiStatLabel, { color: colors.textSecondary }]}>Tổng</Text>
                  </View>
                  <View style={[styles.aiStatItem, { borderColor: colors.border }]}>
                    <Text style={[styles.aiStatValue, { color: colors.text }]}>
                      {aiInsights.stats.pending}
                    </Text>
                    <Text style={[styles.aiStatLabel, { color: colors.textSecondary }]}>Chưa xong</Text>
                  </View>
                  <View style={[styles.aiStatItem, { borderColor: colors.border }]}>
                    <Text style={[styles.aiStatValue, { color: colors.text }]}>
                      {aiInsights.stats.completed}
                    </Text>
                    <Text style={[styles.aiStatLabel, { color: colors.textSecondary }]}>Đã hoàn tất</Text>
                  </View>
                </View>
                <View style={styles.aiModalSection}>
                  <Text style={[styles.aiSectionTitle, { color: colors.text }]}>Block nên ưu tiên</Text>
                  {aiInsights.focusBlocks.length ? (
                    aiInsights.focusBlocks.map((item) => (
                      <View key={item.id} style={[styles.aiFocusItem, { borderColor: colors.border }]}>
                        <Text style={[styles.aiFocusTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.aiFocusTime, { color: colors.textSecondary }]}>
                          {item.range} · {item.typeLabel}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: colors.textSecondary }}>
                      Không có nhiệm vụ nào cần ưu tiên trong ngày này.
                    </Text>
                  )}
                </View>
                {aiInsights.quickWins.length > 0 && (
                  <View style={styles.aiModalSection}>
                    <Text style={[styles.aiSectionTitle, { color: colors.text }]}>Quick wins</Text>
                    {aiInsights.quickWins.map((item) => (
                      <View
                        key={item.id}
                        style={[styles.aiQuickWinItem, { borderColor: colors.border }]}
                      >
                        <Text style={[styles.aiFocusTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary }]}>
                          {item.reason}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {aiInsights.upcoming.length > 0 && (
                  <View style={styles.aiModalSection}>
                    <Text style={[styles.aiSectionTitle, { color: colors.text }]}>Sắp đến hạn</Text>
                    {aiInsights.upcoming.map((item) => (
                      <View key={item.id} style={styles.aiUpcomingItem}>
                        <Text style={[styles.aiFocusTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.aiFocusTime, { color: colors.textSecondary }]}>
                          {item.dateLabel}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Năng suất tuần */}
                {aiInsights.weekProductivity !== undefined && (
                  <View style={styles.aiModalSection}>
                    <Text style={[styles.aiSectionTitle, { color: colors.text }]}>📊 Năng suất tuần</Text>
                    <View style={[styles.aiConfidenceBar, { backgroundColor: colors.border, marginTop: 8 }]}>
                      <View
                        style={[
                          styles.aiConfidenceValue,
                          { backgroundColor: colors.primary, width: `${aiInsights.weekProductivity}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary, marginTop: 4 }]}>
                      Bạn đã hoàn thành {aiInsights.weekProductivity}% công việc trong tuần này
                    </Text>
                  </View>
                )}

                {/* Phân tích loại công việc */}
                {aiInsights.typeInsights && aiInsights.typeInsights.length > 0 && (
                  <View style={styles.aiModalSection}>
                    <Text style={[styles.aiSectionTitle, { color: colors.text }]}>📋 Phân tích loại công việc</Text>
                    {aiInsights.typeInsights.map((insight, index) => (
                      <View key={index} style={[styles.aiFocusItem, { borderColor: colors.border, marginBottom: 8 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={[styles.aiFocusTitle, { color: colors.text }]}>{insight.type}</Text>
                          <Text style={[styles.aiFocusTime, { color: colors.textSecondary }]}>
                            {insight.completed}/{insight.total} ({insight.rate}%)
                          </Text>
                        </View>
                        <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary }]}>{insight.tip}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Gợi ý ưu tiên */}
                {aiInsights.prioritySuggestions && aiInsights.prioritySuggestions.length > 0 && (
                  <View style={styles.aiModalSection}>
                    <Text style={[styles.aiSectionTitle, { color: colors.text }]}>⭐ Ưu tiên thông minh</Text>
                    {aiInsights.prioritySuggestions.map((suggestion, index) => (
                      <View key={index} style={[styles.aiQuickWinItem, { borderColor: colors.border }]}>
                        <Text style={[styles.aiFocusTitle, { color: colors.text }]}>{suggestion.title}</Text>
                        <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary, marginTop: 4 }]}>
                          {suggestion.reason}
                        </Text>
                        {suggestion.tasks && suggestion.tasks.length > 0 && (
                          <View style={{ marginTop: 8 }}>
                            {suggestion.tasks.map((task, i) => (
                              <Text key={i} style={[styles.aiQuickWinReason, { color: colors.textSecondary }]}>
                                • {task}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Gợi ý thời gian */}
                {aiInsights.timeSuggestions && aiInsights.timeSuggestions.length > 0 && (
                  <View style={styles.aiModalSection}>
                    <Text style={[styles.aiSectionTitle, { color: colors.text }]}>⏰ Gợi ý sắp xếp thời gian</Text>
                    {aiInsights.timeSuggestions.map((suggestion, index) => (
                      <View key={index} style={[styles.aiQuickWinItem, { borderColor: colors.border }]}>
                        <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary }]}>
                          {suggestion.suggestion}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Thống kê thời gian */}
                {aiInsights.timeStats && (
                  <View style={styles.aiModalSection}>
                    <Text style={[styles.aiSectionTitle, { color: colors.text }]}>📈 Thống kê thời gian</Text>
                    <View style={[styles.aiFocusItem, { borderColor: colors.border }]}>
                      <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary }]}>
                        • Công việc có giờ cụ thể: {aiInsights.timeStats.totalTasksWithTime}
                      </Text>
                      {aiInsights.timeStats.earliestTask && (
                        <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary }]}>
                          • Công việc sớm nhất: {aiInsights.timeStats.earliestTask}
                        </Text>
                      )}
                      {aiInsights.timeStats.latestTask && (
                        <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary }]}>
                          • Công việc muộn nhất: {aiInsights.timeStats.latestTask}
                        </Text>
                      )}
                      <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary }]}>
                        • Trung bình {aiInsights.timeStats.averageTasksPerDay} công việc/ngày
                      </Text>
                    </View>
                  </View>
                )}

                {/* Gợi ý cải thiện */}
                {aiInsights.improvementTips && aiInsights.improvementTips.length > 0 && (
                  <View style={styles.aiModalSection}>
                    <Text style={[styles.aiSectionTitle, { color: colors.text }]}>💡 Gợi ý cải thiện</Text>
                    {aiInsights.improvementTips.map((tip, index) => (
                      <View key={index} style={[styles.aiQuickWinItem, { borderColor: colors.border }]}>
                        <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary }]}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Tỷ lệ hoàn thành tổng thể */}
                {aiInsights.overallCompletionRate !== undefined && (
                  <View style={styles.aiModalSection}>
                    <Text style={[styles.aiSectionTitle, { color: colors.text }]}>🎯 Tỷ lệ hoàn thành tổng thể</Text>
                    <View style={[styles.aiConfidenceBar, { backgroundColor: colors.border, marginTop: 8 }]}>
                      <View
                        style={[
                          styles.aiConfidenceValue,
                          { 
                            backgroundColor: aiInsights.overallCompletionRate >= 70 ? '#10b981' : aiInsights.overallCompletionRate >= 50 ? '#f59e0b' : '#ef4444',
                            width: `${aiInsights.overallCompletionRate}%` 
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.aiQuickWinReason, { color: colors.textSecondary, marginTop: 4 }]}>
                      {aiInsights.overallCompletionRate}% công việc đã hoàn thành
                    </Text>
                  </View>
                )}

                <View style={styles.aiModalSection}>
                  <Text style={[styles.aiSectionTitle, { color: colors.text }]}>⚡ Mẹo năng lượng</Text>
                  <Text style={{ color: colors.textSecondary }}>{aiInsights.energyTip}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.aiModalAction, { backgroundColor: colors.primary }]}
                  onPress={closeAiModal}
                >
                  <Text style={styles.aiModalActionText}>Đóng gợi ý</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={styles.aiModalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
    position: 'relative',
    flexWrap: 'nowrap',
  },
  logoTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
    minWidth: 0,
  },
  logoSideLeft: {
    width: 52,
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logoSideRight: {
    width: 52,
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
  menuItems: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    justifyContent: 'center',
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
    textAlign: 'center',
    flexShrink: 1,
  },
  logoTextCenter: {
    position: 'absolute',
    left: 20,
    right: 20,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
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
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
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
  taskDuration: {
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
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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
  aiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  aiModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: '85%',
  },
  aiModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  aiModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiModalSummary: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  aiConfidenceRow: {
    marginBottom: 16,
  },
  aiConfidenceLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  aiConfidenceBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  aiConfidenceValue: {
    height: '100%',
    borderRadius: 4,
  },
  aiStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aiStatItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  aiStatValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  aiStatLabel: {
    fontSize: 12,
  },
  aiModalSection: {
    marginBottom: 20,
  },
  aiSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  aiFocusItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  aiFocusTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiFocusTime: {
    fontSize: 13,
  },
  aiQuickWinItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  aiQuickWinReason: {
    fontSize: 12,
  },
  aiUpcomingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  aiModalAction: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  aiModalActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  aiModalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
