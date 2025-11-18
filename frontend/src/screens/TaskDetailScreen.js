import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import ConfirmDialog from '../components/ConfirmDialog';

export default function TaskDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDarkMode } = useTheme();
  const { task, onTaskUpdated, onTaskDeleted } = route.params || {};

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteInProgressRef = useRef(false);

  // Debug: Log task info
  useEffect(() => {
    if (task) {
      console.log('[TaskDetailScreen] Task loaded:', {
        _id: task._id,
        id: task.id,
        title: task.title,
        hasOnTaskDeleted: !!onTaskDeleted,
      });
    }
  }, [task, onTaskDeleted]);

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

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

  const getTaskTypeName = (type) => {
    switch (type) {
      case 'meeting':
        return 'Cuộc họp';
      case 'work':
        return 'Công việc';
      case 'personal':
        return 'Cá nhân';
      default:
        return 'Mặc định';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Nếu dateString là Date object, convert sang string
    let dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString().split('T')[0];
    // Parse date string (YYYY-MM-DD) thành year, month, day để tránh timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    if ([year, month, day].some((part) => Number.isNaN(part))) {
      return '';
    }
    // Tạo Date object từ local time (month - 1 vì Date month bắt đầu từ 0)
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleEdit = () => {
    navigation.navigate('EditTask', { task, onTaskUpdated });
  };

  const performDelete = async (taskId) => {
    // Prevent multiple simultaneous requests
    if (deleteInProgressRef.current) {
      console.warn('[TaskDetailScreen] Delete already in progress, ignoring duplicate request');
      return;
    }

    deleteInProgressRef.current = true;
    setIsDeleting(true);
    
    try {
      console.log('[TaskDetailScreen] ========== STARTING DELETE ==========');
      console.log('[TaskDetailScreen] Task ID:', taskId);
      console.log('[TaskDetailScreen] API Base URL:', api.defaults.baseURL);
      console.log('[TaskDetailScreen] Full URL:', `${api.defaults.baseURL}/tasks/${taskId}`);
      
      const deletePromise = api.delete(`/tasks/${taskId}`);
      console.log('[TaskDetailScreen] Delete request sent, waiting for response...');
      
      const response = await deletePromise;
      
      console.log('[TaskDetailScreen] Delete response received!');
      console.log('[TaskDetailScreen] Response status:', response.status);
      console.log('[TaskDetailScreen] Response data:', response.data);
      
      if (response.status === 200 || response.status === 204) {
        console.log('[TaskDetailScreen] Task deleted successfully!');
        
        // Đợi một chút để đảm bảo state được update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (onTaskDeleted) {
          console.log('[TaskDetailScreen] Calling onTaskDeleted callback');
          try {
            onTaskDeleted();
            console.log('[TaskDetailScreen] onTaskDeleted callback executed successfully');
          } catch (callbackError) {
            console.error('[TaskDetailScreen] Error in onTaskDeleted callback:', callbackError);
          }
        } else {
          console.warn('[TaskDetailScreen] onTaskDeleted callback not provided');
        }
        
        // Navigate back sau khi callback được gọi
        setTimeout(() => {
          console.log('[TaskDetailScreen] Navigating back...');
          navigation.goBack();
        }, 200);
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('[TaskDetailScreen] ========== DELETE ERROR ==========');
      console.error('[TaskDetailScreen] Error object:', error);
      console.error('[TaskDetailScreen] Error type:', error.constructor.name);
      console.error('[TaskDetailScreen] Error message:', error.message);
      console.error('[TaskDetailScreen] Error code:', error.code);
      console.error('[TaskDetailScreen] Error response:', error.response?.data);
      console.error('[TaskDetailScreen] Error status:', error.response?.status);
      console.error('[TaskDetailScreen] Error headers:', error.response?.headers);
      console.error('[TaskDetailScreen] Error config:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
      });
      console.error('[TaskDetailScreen] ====================================');
      
      let errorMessage = 'Không thể xóa công việc. Vui lòng thử lại.';
      if (error.response?.data?.msg) {
        errorMessage = error.response.data.msg;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và đảm bảo backend đang chạy.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Vui lòng thử lại.';
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      deleteInProgressRef.current = false;
      setIsDeleting(false);
      console.log('[TaskDetailScreen] Delete process completed, resetting state');
    }
  };

  const handleDelete = () => {
    // Prevent multiple simultaneous delete requests
    if (deleteInProgressRef.current || isDeleting) {
      console.warn('[TaskDetailScreen] Delete already in progress, ignoring request');
      return;
    }

    // Kiểm tra task._id hoặc task.id trước khi xóa
    const taskId = task._id || task.id;
    if (!taskId) {
      console.error('[TaskDetailScreen] No task ID found:', task);
      if (Platform.OS === 'web') {
        window.alert('Lỗi: Không tìm thấy ID của công việc. Vui lòng thử lại.');
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy ID của công việc. Vui lòng thử lại.');
      }
      return;
    }

    console.log('[TaskDetailScreen] Attempting to delete task:', taskId);

    // Trên web, dùng custom dialog; trên mobile có thể dùng Alert hoặc dialog
    if (Platform.OS === 'web') {
      // Web: dùng custom dialog
      setShowDeleteConfirm(true);
    } else {
      // Mobile: dùng Alert
      Alert.alert(
        'Xóa công việc',
        'Bạn có chắc chắn muốn xóa công việc này?',
        [
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => {
              console.log('[TaskDetailScreen] Delete cancelled by user');
            },
          },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: () => {
              console.log('[TaskDetailScreen] Delete button pressed in Alert!');
              console.log('[TaskDetailScreen] Calling performDelete with taskId:', taskId);
              performDelete(taskId).catch((err) => {
                console.error('[TaskDetailScreen] Unhandled error in performDelete:', err);
              });
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleConfirmDelete = () => {
    const taskId = task._id || task.id;
    setShowDeleteConfirm(false);
    console.log('[TaskDetailScreen] Delete confirmed, calling performDelete with taskId:', taskId);
    performDelete(taskId).catch((err) => {
      console.error('[TaskDetailScreen] Unhandled error in performDelete:', err);
    });
  };

  const taskColor = getTaskColor(task.type);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chi tiết công việc</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Icon & Title */}
        <View style={[styles.taskHeader, { backgroundColor: colors.surface }]}>
          <View style={[styles.taskIconContainer, { backgroundColor: taskColor + '20' }]}>
            <Ionicons name={getTaskIcon(task.type)} size={32} color={taskColor} />
          </View>
          <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
          {task.completed && (
            <View style={[styles.completedBadge, { backgroundColor: colors.greenLight }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.greenIcon} />
              <Text style={[styles.completedText, { color: colors.greenIcon }]}>Đã hoàn thành</Text>
            </View>
          )}
        </View>

        {/* Task Info */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Ngày</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(task.date)}</Text>
            </View>
          </View>

          <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: colors.blueLight }]}>
              <Ionicons name="time-outline" size={20} color={colors.blueIcon} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Giờ</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{task.time}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={[styles.infoIcon, { backgroundColor: taskColor + '20' }]}>
              <Ionicons name={getTaskIcon(task.type)} size={20} color={taskColor} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Loại</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{getTaskTypeName(task.type)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {task.notes && (
          <View style={[styles.infoSection, { backgroundColor: colors.surface, marginTop: 16 }]}>
            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: colors.yellowLight }]}>
                <Feather name="file-text" size={20} color={colors.yellowIcon} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Ghi chú</Text>
                <Text style={[styles.infoValue, { color: colors.text, lineHeight: 22 }]}>{task.notes}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleEdit}
          >
            <Feather name="edit" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Chỉnh sửa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Text style={styles.actionButtonText}>Đang xóa...</Text>
            ) : (
              <>
                <Feather name="trash-2" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Xóa</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Xóa công việc"
        message="Bạn có chắc chắn muốn xóa công việc này?"
        confirmText="Xóa"
        cancelText="Hủy"
        confirmStyle="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          console.log('[TaskDetailScreen] Delete cancelled by user');
          setShowDeleteConfirm(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  taskHeader: {
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  taskIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});