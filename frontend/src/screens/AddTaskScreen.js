import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
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

export default function AddTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();

  const initialDateParam = route.params?.date;
  const getInitialDate = () => {
    if (!initialDateParam) {
      return new Date();
    }
    // Parse date string (YYYY-MM-DD) thành year, month, day để tránh timezone issues
    const [year, month, day] = initialDateParam.split('-').map(Number);
    if ([year, month, day].some((part) => Number.isNaN(part))) {
      return new Date();
    }
    // Tạo Date object từ local time (month - 1 vì Date month bắt đầu từ 0)
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  };
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getInitialDate);
  const [time, setTime] = useState(new Date());
  const [allDay, setAllDay] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [hasFixedTime, setHasFixedTime] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [taskType, setTaskType] = useState('work'); // 'work', 'personal', 'meeting'
  const [notes, setNotes] = useState('');
  const isWeb = Platform.OS === 'web';

  // Helper function để format date thành YYYY-MM-DD từ local time
  const formatDateToString = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const handleAddTask = async () => {
    if (!title.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề công việc.');
      return;
    }

    if (!user) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để thêm công việc.');
      return;
    }
    if (!user._id) {
      Alert.alert('Lỗi', 'Không lấy được userId. Vui lòng đăng nhập lại.');
      return;
    }

    const parsedDuration = Number(durationMinutes);
    if (!allDay && durationMinutes && (Number.isNaN(parsedDuration) || parsedDuration <= 0)) {
      Alert.alert('Lỗi', 'Thời lượng phải là số phút hợp lệ.');
      return;
    }

    const timeValue = allDay
      ? '00:00'
      : hasFixedTime ? time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null;

    const newTask = {
      title: title.trim(),
      dueDate: formatDateToString(date), // YYYY-MM-DD từ local time
      allDay,
      time: timeValue, // HH:mm or null for flexible tasks
      durationMinutes: allDay ? (24 * 60) : (durationMinutes ? parsedDuration : undefined),
      type: taskType,
      notes: notes.trim(),
      userId: user._id,
      completed: false,
    };

    try {
      const response = await api.post('/tasks', newTask);
      console.log('Task created successfully:', response.data);
      navigation.goBack();
    } catch (error) {
      console.error('Add task error:', error.response?.data || error.message);
      console.error('Full error:', error);
      Alert.alert(
        'Lỗi',
        `Không thể thêm công việc: ${error.response?.data?.msg || error.message || 'Vui lòng thử lại.'}`
      );
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

  const handleWebDateInputChange = (event) => {
    const value = event?.target?.value;
    if (!value) {
      return;
    }
    const [year, month, day] = value.split('-').map(Number);
    if ([year, month, day].some((part) => Number.isNaN(part))) {
      return;
    }
    const updatedDate = new Date(date);
    updatedDate.setFullYear(year, Math.max(month - 1, 0), day);
    setDate(updatedDate);
  };

  const handleWebTimeInputChange = (event) => {
    const value = event?.target?.value;
    if (!value) {
      return;
    }
    const [hours, minutes] = value.split(':').map(Number);
    if ([hours, minutes].some((part) => Number.isNaN(part))) {
      return;
    }
    const updatedTime = new Date(time);
    updatedTime.setHours(hours);
    updatedTime.setMinutes(minutes);
    setTime(updatedTime);
  };

  const formatDateTimeLocalValue = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formattedDate = date.toLocaleDateString('vi-VN');
  const formattedTime = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const isoDateValue = formatDateToString(date); // Dùng local time thay vì ISO
  const htmlTimeValue = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add New Task</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Task Title */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Task Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter task title"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Task Type */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Task Type</Text>
          <View style={styles.taskTypeContainer}>
            <TouchableOpacity
              style={[styles.taskTypeButton, getTaskTypeStyle('work')]}
              onPress={() => setTaskType('work')}
            >
              <Text style={[styles.taskTypeText, getTaskTypeText('work')]}>Work</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.taskTypeButton, getTaskTypeStyle('personal')]}
              onPress={() => setTaskType('personal')}
            >
              <Text style={[styles.taskTypeText, getTaskTypeText('personal')]}>Personal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.taskTypeButton, getTaskTypeStyle('meeting')]}
              onPress={() => setTaskType('meeting')}
            >
              <Text style={[styles.taskTypeText, getTaskTypeText('meeting')]}>Meeting</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
          {isWeb ? (
            <View style={[styles.input, styles.webInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <input
                type="date"
                value={isoDateValue}
                onChange={handleWebDateInputChange}
                style={{
                  flex: 1,
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: colors.text,
                  fontSize: 16,
                  paddingLeft: 16,
                  paddingRight: 16,
                }}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: colors.text }}>{formattedDate}</Text>
                <Ionicons name="calendar" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  testID="datePicker"
                  value={date}
                  display="spinner"
                  onChange={onDateChange}
                />
              )}
            </>
          )}
        </View>

        {/* All day */}
        <View style={styles.inputGroup}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Cả ngày</Text>
            <Switch
              value={allDay}
              onValueChange={(value) => {
                setAllDay(value);
                if (value) {
                  setHasFixedTime(false);
                }
              }}
            />
          </View>
        </View>

        {/* Fixed Time Toggle */}
        {!allDay && (
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Giờ cố định</Text>
              <Switch value={hasFixedTime} onValueChange={setHasFixedTime} />
            </View>
          </View>
        )}

        {/* Time Picker */}
        {!allDay && hasFixedTime ? (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
            {isWeb ? (
              <View style={[styles.input, styles.webInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <input
                  type="time"
                  value={htmlTimeValue}
                  onChange={handleWebTimeInputChange}
                  style={{
                    flex: 1,
                    height: '100%',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: colors.text,
                    fontSize: 16,
                    paddingLeft: 16,
                    paddingRight: 16,
                  }}
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, justifyContent: 'center' }]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={{ color: colors.text }}>{formattedTime}</Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    testID="timePicker"
                    value={time}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                  />
                )}
              </>
            )}
          </View>
        ) : null}

        {/* Duration */}
        {!allDay ? (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Duration (minutes)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              placeholder="30"
              placeholderTextColor={colors.textTertiary}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
            />
          </View>
        ) : null}

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add some notes..."
            placeholderTextColor={colors.textTertiary}
            multiline
          />
        </View>

        {/* Add Task Button */}
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAddTask}>
          <Text style={styles.addButtonText}>Add Task</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 12,
    paddingBottom: 12,
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
  },
  taskTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  taskTypeText: {
    fontWeight: '600',
  },
  addButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  webInputWrapper: {
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
});