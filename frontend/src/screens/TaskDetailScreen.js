import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';

export default function TaskDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDarkMode } = useTheme();
  const { task, onTaskUpdated, onTaskDeleted } = route.params || {};

  const [isDeleting, setIsDeleting] = useState(false);

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
    const date = new Date(dateString);
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

  const handleDelete = () => {
    Alert.alert(
      'Xóa công việc',
      'Bạn có chắc chắn muốn xóa công việc này?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await api.delete(`/tasks/${task._id}`);
              if (onTaskDeleted) {
                onTaskDeleted();
              }
              navigation.goBack();
            } catch (error) {
              console.error('Delete task error:', error);
              Alert.alert('Lỗi', 'Không thể xóa công việc. Vui lòng thử lại.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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


