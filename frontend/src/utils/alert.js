import { Platform, Alert as RNAlert } from 'react-native';

/**
 * Cross-platform Alert utility
 * Trên web, sử dụng window.confirm và window.alert
 * Trên mobile, sử dụng React Native Alert
 */
export const showAlert = (title, message, buttons = [], options = {}) => {
  if (Platform.OS === 'web') {
    // Web implementation
    if (buttons.length === 0) {
      // Simple alert
      window.alert(`${title}\n\n${message}`);
      return;
    }

    if (buttons.length === 1) {
      // Single button (usually OK)
      window.alert(`${title}\n\n${message}`);
      if (buttons[0].onPress) {
        buttons[0].onPress();
      }
      return;
    }

    if (buttons.length === 2) {
      // Two buttons (usually Cancel and Action)
      const cancelButton = buttons.find(b => b.style === 'cancel') || buttons[0];
      const actionButton = buttons.find(b => b.style !== 'cancel') || buttons[1];
      
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && actionButton.onPress) {
        actionButton.onPress();
      } else if (!result && cancelButton.onPress) {
        cancelButton.onPress();
      }
      return;
    }

    // Multiple buttons - use native Alert as fallback
    RNAlert.alert(title, message, buttons, options);
  } else {
    // Mobile implementation
    RNAlert.alert(title, message, buttons, options);
  }
};

/**
 * Simple alert với một nút OK
 */
export const alert = (title, message, onPress) => {
  showAlert(title, message, [
    {
      text: 'OK',
      onPress: onPress || (() => {}),
    },
  ]);
};

/**
 * Confirmation dialog với Cancel và OK/Action
 */
export const confirm = (title, message, onConfirm, onCancel) => {
  showAlert(title, message, [
    {
      text: 'Hủy',
      style: 'cancel',
      onPress: onCancel || (() => {}),
    },
    {
      text: 'Xác nhận',
      onPress: onConfirm || (() => {}),
    },
  ]);
};

export default showAlert;

