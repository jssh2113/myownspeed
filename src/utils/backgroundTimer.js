import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

// 알림 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 알림 권한 요청
export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// 잠금화면에 타이머 상태 표시
export async function showTimerNotification(timerLabel, remaining) {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏃 My Own Speed - 러닝 중',
      body: `${timerLabel} 남은 시간: ${remaining}`,
      sticky: true,
      autoDismiss: false,
    },
    trigger: null, // 즉시 표시
  });
}

// 타이머 완료 알림
export async function showTimerCompleteNotification(timerLabel) {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ 러닝 완료!',
      body: `${timerLabel} 완료됐어요! 잘 하셨어요 🎉`,
    },
    trigger: null,
  });
}

// 모든 알림 제거
export async function clearTimerNotification() {
  await Notifications.dismissAllNotificationsAsync();
}

// 앱 상태 감지 (백그라운드/포그라운드)
export function setupAppStateListener(onBackground, onForeground) {
  const subscription = AppState.addEventListener('change', nextState => {
    if (nextState === 'background' || nextState === 'inactive') {
      onBackground();
    } else if (nextState === 'active') {
      onForeground();
    }
  });
  return subscription;
}
