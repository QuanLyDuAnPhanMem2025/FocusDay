import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function EditTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { task, onTaskUpdated } = route.params || {};

  const [title, setTitle] = useState(task?.title || '');
  const [date, setDate] = useState(task ? new Date(task.date) : new Date());
  const [time, setTime] = useState(() => {
    if (task?.time) {
      const [hours, minutes] = task.time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours), parseInt(minutes));
      return timeDate;
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [taskType, setTaskType] = useState(task?.type || 'work');
  const [notes, setNotes] = useState(task?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setTaskType(task.type || 'work');
      setNotes(task.notes || '');
      if (task.date) {
        setDate(new Date(task.date));
      }
      if (task.time) {
        const [hours, minutes] = task.time.split(':');
        const timeDate = new Date();
        timeDate.setHours(parseInt(hours), parseInt(minutes));
        setTime(timeDate);
      }
    }
  }, [task]);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const onTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentTime);
  };

  const handleUpdateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề công việc.');
      return;
    }
    if (!user) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để chỉnh sửa công việc.');
      return;
    }
    if (!task?._id) {
      Alert.alert('Lỗi', 'Không tìm thấy công việc để chỉnh sửa.');
      return;
    }

    setIsSaving(true);

    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const updatedTask = {
      title: title.trim(),
      dueDate: formattedDate,
      time: time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), // HH:mm
      type: taskType,
      notes: notes.trim(),
    };

    try {
      const response = await api.put(`/tasks/${task._id}`, updatedTask);
      console.log('Task updated successfully:', response.data);
      if (onTaskUpdated) {
        onTaskUpdated(response.data);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Update task error:', error.response?.data || error.message);
      console.error('Full error:', error);
      Alert.alert(
        'Lỗi',
        `Không thể cập nhật công việc: ${error.response?.data?.msg || error.message || 'Vui lòng thử lại.'}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getTaskTypeStyle = (type) => {
    if (type === taskType) {
      return {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      };
    }
    return {
      borderColor: colors.border,
    };
  };

  const getTaskTypeText = (type) => {
    if (type === taskType) {
      return {
        color: '#fff',
      };
    }
    return {
      color: colors.textSecondary,
    };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chỉnh sửa công việc</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Task Title */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Tiêu đề công việc</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Nhập tiêu đề công việc"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Task Type */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Loại công việc</Text>
          <View style={styles.taskTypeContainer}>
            <TouchableOpacity
              style={[styles.taskTypeButton, getTaskTypeStyle('work')]}
              onPress={() => setTaskType('work')}
            >
              <Text style={[styles.taskTypeText, getTaskTypeText('work')]}>Công việc</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.taskTypeButton, getTaskTypeStyle('personal')]}
              onPress={() => setTaskType('personal')}
            >
              <Text style={[styles.taskTypeText, getTaskTypeText('personal')]}>Cá nhân</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.taskTypeButton, getTaskTypeStyle('meeting')]}
              onPress={() => setTaskType('meeting')}
            >
              <Text style={[styles.taskTypeText, getTaskTypeText('meeting')]}>Cuộc họp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Ngày</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, justifyContent: 'center' }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: colors.text }}>{date.toLocaleDateString('vi-VN')}</Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            testID="datePicker"
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        {/* Time Picker */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Giờ</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, justifyContent: 'center' }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={{ color: colors.text }}>{time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        </View>
        {showTimePicker && (
          <DateTimePicker
            testID="timePicker"
            value={time}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Ghi chú</Text>
          <TextInput
            style={[styles.input, styles.notesInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Thêm ghi chú..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>

        {/* Update Task Button */}
        <TouchableOpacity
          style={[styles.updateButton, { backgroundColor: colors.primary }]}
          onPress={handleUpdateTask}
          disabled={isSaving}
        >
          <Text style={styles.updateButtonText}>
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Text>
        </TouchableOpacity>
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
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  taskTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  taskTypeText: {
    fontWeight: '600',
    fontSize: 14,
  },
  updateButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


