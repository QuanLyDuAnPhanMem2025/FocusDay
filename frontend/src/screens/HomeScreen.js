import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import CalendarStrip from 'react-native-calendar-strip';
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';

const HomeScreen = () => {
  const [selectedDate, setSelectedDate] = useState(moment());

  const dummyTasks = [
    {
      id: 1,
      title: 'Họp team dự án',
      time: '09:00 - 10:30',
      priority: 'high',
    },
    {
      id: 2,
      title: 'Review code',
      time: '11:00 - 12:00',
      priority: 'medium',
    },
    {
      id: 3,
      title: 'Viết báo cáo tuần',
      time: '14:00 - 15:00',
      priority: 'low',
    },
  ];

  const TaskCard = ({ task }) => (
    <TouchableOpacity style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTime}>{task.time}</Text>
        <View style={[styles.priorityIndicator, 
          task.priority === 'high' ? styles.highPriority :
          task.priority === 'medium' ? styles.mediumPriority :
          styles.lowPriority
        ]} />
      </View>
      <Text style={styles.taskTitle}>{task.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch của tôi</Text>
        <TouchableOpacity style={styles.addButton}>
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <CalendarStrip
        style={styles.calendar}
        calendarColor={'#fff'}
        calendarHeaderStyle={styles.calendarHeader}
        dateNumberStyle={styles.dateNumber}
        dateNameStyle={styles.dateName}
        highlightDateNumberStyle={styles.highlightDateNumber}
        highlightDateNameStyle={styles.highlightDateName}
        disabledDateNameStyle={styles.disabledDateName}
        disabledDateNumberStyle={styles.disabledDateNumber}
        iconContainer={{flex: 0.1}}
        selectedDate={selectedDate}
        onDateSelected={(date) => setSelectedDate(date)}
      />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Công việc hôm nay</Text>
        <ScrollView style={styles.taskList}>
          {dummyTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendar: {
    height: 100,
    paddingTop: 20,
    paddingBottom: 10,
  },
  calendarHeader: {
    color: '#000',
  },
  dateNumber: {
    color: '#000',
  },
  dateName: {
    color: '#000',
  },
  highlightDateNumber: {
    color: '#007AFF',
  },
  highlightDateName: {
    color: '#007AFF',
  },
  disabledDateName: {
    color: 'grey',
  },
  disabledDateNumber: {
    color: 'grey',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  taskList: {
    flex: 1,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskTime: {
    color: '#666',
    fontSize: 14,
  },
  taskTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  priorityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  highPriority: {
    backgroundColor: '#FF3B30',
  },
  mediumPriority: {
    backgroundColor: '#FF9500',
  },
  lowPriority: {
    backgroundColor: '#34C759',
  },
});

export default HomeScreen;