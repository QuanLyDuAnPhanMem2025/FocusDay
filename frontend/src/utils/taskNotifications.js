import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'task_notification_map_v1';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ensureAndroidChannelAsync = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('task-reminders', {
    name: 'Task Reminders',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
};

const loadMap = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch {
    return {};
  }
};

const saveMap = async (map) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map || {}));
};

export const ensureNotificationPermissionAsync = async () => {
  if (Platform.OS === 'web') {
    return false;
  }

  await ensureAndroidChannelAsync();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
};

export const cancelTaskReminderAsync = async (taskId) => {
  if (!taskId) return;
  const map = await loadMap();
  const notificationId = map[taskId];
  if (!notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } finally {
    delete map[taskId];
    await saveMap(map);
  }
};

const parseDateTimeLocal = (dateValue, timeString) => {
  if (!dateValue || !timeString) return null;

  let year;
  let month;
  let day;

  if (typeof dateValue === 'string') {
    const datePart = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
    const parts = datePart.split('-').map(Number);
    if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
    [year, month, day] = parts;
  } else if (dateValue instanceof Date) {
    year = dateValue.getFullYear();
    month = dateValue.getMonth() + 1;
    day = dateValue.getDate();
  } else {
    return null;
  }

  const [hh, mm] = String(timeString).split(':').map(Number);
  if ([hh, mm].some((p) => Number.isNaN(p))) return null;

  return new Date(year, month - 1, day, hh, mm, 0, 0);
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

const buildTaskNotificationContent = (task) => {
  const title = String(task?.title || 'Công việc').trim() || 'Công việc';
  const typeLabel = getTaskTypeLabel(task?.type);
  const time = task?.time ? `Bắt đầu: ${task.time}` : null;
  const durationMinutes = Number(task?.durationMinutes);
  const duration = Number.isFinite(durationMinutes) && durationMinutes > 0
    ? `Thời lượng: ${durationMinutes} phút`
    : null;
  const lines = [`Loại: ${typeLabel}`, time, duration].filter(Boolean);

  return {
    title,
    subtitle: 'FocusDay',
    body: lines.join('\n'),
    sound: 'default',
  };
};

export const scheduleTaskReminderAsync = async (task, options = {}) => {
  const {
    minutesBefore = 0,
    enabled = true,
  } = options;

  const taskId = task?._id || task?.id;
  if (!enabled || !taskId) {
    if (__DEV__) console.log('[taskNotifications] Skip schedule: disabled or missing taskId');
    return null;
  }

  await cancelTaskReminderAsync(taskId);

  if (Platform.OS === 'web') {
    if (__DEV__) console.log('[taskNotifications] Skip schedule: web platform');
    return null;
  }

  const granted = await ensureNotificationPermissionAsync();
  if (!granted) {
    if (__DEV__) console.log('[taskNotifications] Skip schedule: permission not granted');
    return null;
  }

  if (task?.completed) {
    if (__DEV__) console.log('[taskNotifications] Skip schedule: task completed', { taskId });
    return null;
  }
  if (!task?.time) {
    if (__DEV__) console.log('[taskNotifications] Skip schedule: missing time (flexible task)', { taskId });
    return null;
  }

  const dateValue = task?.dueDate || task?.date;
  const eventDate = parseDateTimeLocal(dateValue, task.time);
  if (!eventDate) {
    if (__DEV__) console.log('[taskNotifications] Skip schedule: cannot parse date/time', { taskId, dateValue, time: task?.time });
    return null;
  }

  const notifyAt = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);
  if (__DEV__) console.log('[taskNotifications] Parsed times:', { dateValue, time: task.time, eventDate: eventDate.toISOString(), notifyAt: notifyAt.toISOString(), minutesBefore });

  if (Number.isNaN(notifyAt.getTime())) {
    if (__DEV__) console.log('[taskNotifications] Skip schedule: invalid notifyAt', { taskId, eventDate, minutesBefore });
    return null;
  }

  if (notifyAt.getTime() <= Date.now() + 1000) {
    if (__DEV__) {
      console.log('[taskNotifications] Skip schedule: notifyAt is in the past/too soon', {
        taskId,
        now: new Date().toISOString(),
        eventDate: eventDate.toISOString(),
        notifyAt: notifyAt.toISOString(),
        minutesBefore,
      });
    }
    return null;
  }

  // Final guard: ensure notifyAt is a valid Date object
  if (!(notifyAt instanceof Date) || Number.isNaN(notifyAt.getTime())) {
    if (__DEV__) console.log('[taskNotifications] Skip schedule: invalid notifyAt Date', { taskId, notifyAt });
    return null;
  }

  if (__DEV__) console.log('[taskNotifications] Scheduling with trigger (date):', { notifyAt: notifyAt.toISOString() });

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      channelId: Platform.OS === 'android' ? 'task-reminders' : undefined,
      ...buildTaskNotificationContent(task),
      data: {
        taskId,
      },
    },
    trigger: { type: 'date', date: notifyAt },
  });

  if (__DEV__) console.log('[taskNotifications] Scheduled', { taskId, notificationId, notifyAt: notifyAt.toISOString() });

  const map = await loadMap();
  map[taskId] = notificationId;
  await saveMap(map);

  return notificationId;
};

export const debugListScheduledNotificationsAsync = async () => {
  if (Platform.OS === 'web') return [];
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (__DEV__) console.log('[taskNotifications] Scheduled list:', scheduled);
  return scheduled;
};

export const debugSendTestNotificationAsync = async () => {
  if (Platform.OS === 'web') return;
  await ensureAndroidChannelAsync();
  const granted = await ensureNotificationPermissionAsync();
  if (!granted) {
    if (__DEV__) console.log('[taskNotifications] Test notification blocked: permission not granted');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      channelId: Platform.OS === 'android' ? 'task-reminders' : undefined,
      title: 'Test thông báo',
      subtitle: 'FocusDay',
      body: 'Thông báo đang hoạt động bình thường.',
      sound: 'default',
      data: { type: 'test' },
    },
    trigger: { type: 'notifications' },
  });
};

export const debugSendTaskNotificationNowAsync = async (task) => {
  if (Platform.OS === 'web') return;
  await ensureAndroidChannelAsync();
  const granted = await ensureNotificationPermissionAsync();
  if (!granted) {
    if (__DEV__) console.log('[taskNotifications] Task test blocked: permission not granted');
    return;
  }

  const taskId = task?._id || task?.id;

  await Notifications.scheduleNotificationAsync({
    content: {
      channelId: Platform.OS === 'android' ? 'task-reminders' : undefined,
      ...buildTaskNotificationContent(task),
      data: { taskId, type: 'task-test' },
    },
    trigger: { type: 'notifications' },
  });
};
