import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, SafeAreaView, TextInput, Alert, AppState
} from 'react-native';
import { useRun } from '../context/RunContext';
import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import Svg, { Polygon } from 'react-native-svg';
import {
  requestNotificationPermission,
  showTimerNotification,
  showTimerCompleteNotification,
  clearTimerNotification,
} from '../utils/backgroundTimer';

function pad(n) { return String(n).padStart(2, '0'); }
function fmtSec(s) { const m = Math.floor(s / 60); return `${pad(m)}:${pad(s % 60)}`; }
function goalToSec(g) { return g.h * 3600 + g.m * 60 + g.s; }

function secToLabel(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (h > 0) parts.push(h + 'h');
  if (m > 0) parts.push(m + 'm');
  if (s > 0) parts.push(s + 's');
  return parts.join(' ') || '0s';
}

function buildGoalLabel(timers) {
  if (!timers || timers.length === 0) return '';
  const countMap = {};
  timers.forEach(t => {
    countMap[t.totalSec] = (countMap[t.totalSec] || 0) + 1;
  });
  const sorted = Object.keys(countMap)
    .map(sec => ({ sec: parseInt(sec), count: countMap[sec] }))
    .sort((a, b) => a.sec - b.sec);
  return sorted.map(g => secToLabel(g.sec) + ' x' + g.count).join(',  ');
}

function expandGoals(goals) {
  const timers = [];
  goals.filter(g => goalToSec(g) > 0).forEach(g => {
    for (let i = 0; i < g.repeat; i++) {
      timers.push({ totalSec: goalToSec(g), remaining: goalToSec(g), state: 'idle', walkSec: null });
    }
  });
  return timers;
}

function WideStar({ w, h, color }) {
  const cx = w / 2, cy = h / 2;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const rx = i % 2 === 0 ? w * 0.5 : w * 0.18;
    const ry = i % 2 === 0 ? h * 0.5 : h * 0.18;
    pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
  }
  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Polygon points={pts.join(' ')} fill={color} />
    </Svg>
  );
}

export default function RunningScreen({ navigation }) {
  const { currentGoals, saveSession, saveActiveSession, clearActiveSession } = useRun();
  const { user } = useAuth();

  const today = new Date();
  const dateLabel = `${String(today.getMonth() + 1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;

  const [timers, setTimers] = useState(() => expandGoals(currentGoals));
  const [activeIdx, setActiveIdx] = useState(null);
  const [walkSec, setWalkSec] = useState(0);
  const [walkActive, setWalkActive] = useState(false);
  const [activeWalkForIdx, setActiveWalkForIdx] = useState(null);
  const [showReorder, setShowReorder] = useState(false);
  const [reorderList, setReorderList] = useState(() => expandGoals(currentGoals));
  const [showChange, setShowChange] = useState(false);
  const [changeIdx, setChangeIdx] = useState(null);
  const [changeH, setChangeH] = useState('');
  const [changeM, setChangeM] = useState('');
  const [changeS, setChangeS] = useState('');

  const intervalRef = useRef(null);
  const walkRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const bgStartTimeRef = useRef(null);
  const activeIdxRef = useRef(null);
  const timersRef = useRef(timers);

  // timers 최신값 ref에 동기화
  useEffect(() => { timersRef.current = timers; }, [timers]);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  // 알림 권한 요청
  useEffect(() => {
    requestNotificationPermission();

    // 앱 상태 변화 감지
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      clearTimerNotification();
    };
  }, []);

  function handleAppStateChange(nextState) {
    const prevState = appStateRef.current;
    appStateRef.current = nextState;

    if (nextState === 'background' || nextState === 'inactive') {
      // 백그라운드로 갈 때 - 현재 시작 시간 저장
      if (activeIdxRef.current !== null) {
        bgStartTimeRef.current = Date.now();
        const t = timersRef.current[activeIdxRef.current];
        if (t) {
          showTimerNotification(`타이머 ${activeIdxRef.current + 1}`, fmtSec(t.remaining));
        }
      }
    } else if (nextState === 'active') {
      // 포그라운드로 돌아올 때 - 경과 시간 계산해서 보정
      if (bgStartTimeRef.current !== null && activeIdxRef.current !== null) {
        const elapsed = Math.floor((Date.now() - bgStartTimeRef.current) / 1000);
        bgStartTimeRef.current = null;

        setTimers(prev => {
          const next = [...prev];
          const idx = activeIdxRef.current;
          if (idx === null || !next[idx]) return prev;
          const cur = { ...next[idx] };

          if (cur.remaining <= elapsed) {
            // 타이머 완료
            cur.remaining = 0;
            cur.state = 'done';
            next[idx] = cur;
            clearInterval(intervalRef.current);
            setWalkSec(0);
            setWalkActive(true);
            setActiveWalkForIdx(idx);
            setActiveIdx(null);
            showTimerCompleteNotification(`타이머 ${idx + 1}`);
            if (user) autoSave(next);
          } else {
            cur.remaining -= elapsed;
            next[idx] = cur;
          }
          return next;
        });
        clearTimerNotification();
      }
    }
  }

  function goHome() {
    if (user) navigation.navigate('Home');
    else navigation.navigate('GuestHome');
  }

  function canStart(idx) {
    if (idx === 0) return true;
    return timers[idx - 1].state === 'done';
  }

  function openChange(idx) {
    const t = timers[idx];
    const h = Math.floor(t.totalSec / 3600);
    const m = Math.floor((t.totalSec % 3600) / 60);
    const s = t.totalSec % 60;
    setChangeH(h > 0 ? String(h) : '');
    setChangeM(m > 0 ? String(m) : '');
    setChangeS(s > 0 ? String(s) : '');
    setChangeIdx(idx);
    setShowChange(true);
  }

  function applyChange() {
    const h = parseInt(changeH || '0');
    const m = parseInt(changeM || '0');
    const s = parseInt(changeS || '0');
    const total = h * 3600 + m * 60 + s;
    if (total === 0) { Alert.alert('알림', '시간을 입력해주세요!'); return; }
    setTimers(prev => prev.map((t, i) =>
      i === changeIdx ? { ...t, totalSec: total, remaining: total } : t
    ));
    setShowChange(false);
  }

  function startTimer(idx) {
    if (!canStart(idx)) {
      Alert.alert('알림', `${idx}번 러닝을 먼저 완료해주세요!`);
      return;
    }
    if (timers[idx].state === 'done') return;
    clearInterval(intervalRef.current);

    if (walkActive && activeWalkForIdx !== null) {
      setTimers(prev => prev.map((t, i) =>
        i === activeWalkForIdx ? { ...t, walkSec: walkSec } : t
      ));
      clearInterval(walkRef.current);
      setWalkActive(false);
    }

    setActiveIdx(idx);
    setTimers(prev => {
      const next = prev.map((t, i) => i === idx ? { ...t, state: 'running' } : t);
      saveActiveSession(currentGoals, next, today);
      return next;
    });

    intervalRef.current = setInterval(() => {
      setTimers(prev => {
        const next = [...prev];
        const cur = { ...next[idx] };
        if (cur.remaining <= 1) {
          cur.remaining = 0;
          cur.state = 'done';
          next[idx] = cur;
          clearInterval(intervalRef.current);
          setWalkSec(0);
          setWalkActive(true);
          setActiveWalkForIdx(idx);
          setActiveIdx(null);
          showTimerCompleteNotification(`타이머 ${idx + 1}`);
          if (user) autoSave(next);
          return next;
        }
        cur.remaining -= 1;
        // 백그라운드 알림 업데이트 (5초마다)
        if (cur.remaining % 5 === 0 && appStateRef.current !== 'active') {
          showTimerNotification(`타이머 ${idx + 1}`, fmtSec(cur.remaining));
        }
        next[idx] = cur;
        return next;
      });
    }, 1000);
  }

  function pauseTimer(idx) {
    clearInterval(intervalRef.current);
    setTimers(prev => prev.map((t, i) => i === idx ? { ...t, state: 'paused' } : t));
    setActiveIdx(null);
    clearTimerNotification();
  }

  useEffect(() => {
    if (walkActive) {
      walkRef.current = setInterval(() => setWalkSec(s => s + 1), 1000);
    } else {
      clearInterval(walkRef.current);
    }
    return () => clearInterval(walkRef.current);
  }, [walkActive]);

  async function autoSave(currentTimers) {
    const done = currentTimers.filter(t => t.state === 'done').length;
    const total = currentTimers.reduce((sum, t) => sum + (t.totalSec - t.remaining), 0);
    await saveSession(today, currentGoals, currentTimers, total, done);
    // 모든 타이머 완료 시 activeSession 삭제
    const allDone = currentTimers.every(t => t.state === 'done');
    if (allDone) await clearActiveSession();
    else await saveActiveSession(currentGoals, currentTimers, today);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <TouchableOpacity style={styles.homeBtn} onPress={goHome}>
          <Text style={styles.homeBtnText}>home</Text>
        </TouchableOpacity>

        <View style={styles.dateWrap}>
          <WideStar w={300} h={120} color="#DDDDDD" />
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>

        <Text style={styles.goalLabel}>running goal</Text>

        <View style={styles.goalBadgeWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.goalBadgeInner}>
            <Text style={styles.goalBadgeText}>{buildGoalLabel(timers)}</Text>
          </ScrollView>
        </View>

        <View style={styles.timerContainer}>
          <TouchableOpacity style={styles.reorderBtn}
            onPress={() => { setReorderList([...timers]); setShowReorder(true); }}>
            <Text style={styles.reorderText}>순서변경</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 10 }}>
            {timers.map((t, idx) => {
              const isDone = t.state === 'done';
              const isRunning = t.state === 'running';
              const isLocked = !canStart(idx) && t.state === 'idle';
              const isActiveWalk = activeWalkForIdx === idx && walkActive;
              const savedWalk = t.walkSec !== null && t.walkSec !== undefined;

              return (
                <View key={idx}>
                  <View style={[styles.timerRow, isDone && styles.timerDone]}>
                    <Text style={styles.timerNum}>{idx + 1}</Text>
                    <Text style={styles.timerTime}>
                      {isDone ? fmtSec(t.totalSec) : fmtSec(t.remaining)}
                    </Text>
                    {isDone ? null
                    : isRunning ? (
                      <TouchableOpacity onPress={() => pauseTimer(idx)} style={styles.actionBtn}>
                        <Text style={styles.pauseIcon}>II</Text>
                      </TouchableOpacity>
                    ) : isLocked ? (
                      <TouchableOpacity onPress={() => openChange(idx)}>
                        <Text style={styles.changeText}>change</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => startTimer(idx)} style={styles.actionBtn}>
                          <Text style={styles.playIcon}>▶</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openChange(idx)}>
                          <Text style={styles.changeText}>change</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {isActiveWalk && (
                    <View style={styles.walkRow}>
                      <Text style={styles.walkDash}>- - - - -</Text>
                      <Text style={styles.walkText}>{fmtSec(walkSec)}</Text>
                      <Text style={styles.walkDash}>- - - - -</Text>
                    </View>
                  )}
                  {savedWalk && !isActiveWalk && (
                    <View style={styles.walkRow}>
                      <Text style={styles.walkDash}>- - - - -</Text>
                      <Text style={[styles.walkText, { color: '#AAA' }]}>{fmtSec(t.walkSec)}</Text>
                      <Text style={styles.walkDash}>- - - - -</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        <Modal visible={showChange} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.changeModal}>
              <Text style={styles.changeTitle}>시간 수정</Text>
              <View style={styles.changeRow}>
                <TextInput style={[styles.changeBox, { borderColor: COLORS.accentOrange }]}
                  placeholder="0" keyboardType="numeric" maxLength={2}
                  value={changeH} onChangeText={setChangeH} />
                <Text style={styles.changeLabel}>h</Text>
                <TextInput style={[styles.changeBox, { borderColor: COLORS.accentRed }]}
                  placeholder="0" keyboardType="numeric" maxLength={2}
                  value={changeM} onChangeText={setChangeM} />
                <Text style={styles.changeLabel}>m</Text>
                <TextInput style={[styles.changeBox, { borderColor: COLORS.accentBlue }]}
                  placeholder="0" keyboardType="numeric" maxLength={2}
                  value={changeS} onChangeText={setChangeS} />
                <Text style={styles.changeLabel}>s</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={[styles.changeOk, { backgroundColor: COLORS.accentBlue }]} onPress={applyChange}>
                  <Text style={{ color: COLORS.white, fontFamily: 'RumRaisin', fontSize: 16 }}>ok</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.changeOk, { backgroundColor: COLORS.starGray }]} onPress={() => setShowChange(false)}>
                  <Text style={{ color: COLORS.white, fontFamily: 'GowunDodum', fontWeight: '700' }}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showReorder} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.reorderModal}>
              <Text style={styles.reorderTitle}>순서 변경</Text>
              <Text style={styles.reorderHint}>↑↓ 버튼으로 순서를 바꾸세요</Text>
              <ScrollView>
                {reorderList.map((t, idx) => (
                  <View key={idx} style={styles.reorderItem}>
                    <Text style={styles.reorderItemText}>{idx + 1}.  {fmtSec(t.totalSec)}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {idx > 0 && (
                        <TouchableOpacity onPress={() => {
                          const next = [...reorderList];
                          [next[idx-1], next[idx]] = [next[idx], next[idx-1]];
                          setReorderList(next);
                        }}><Text style={styles.reorderArrow}>↑</Text></TouchableOpacity>
                      )}
                      {idx < reorderList.length - 1 && (
                        <TouchableOpacity onPress={() => {
                          const next = [...reorderList];
                          [next[idx], next[idx+1]] = [next[idx+1], next[idx]];
                          setReorderList(next);
                        }}><Text style={styles.reorderArrow}>↓</Text></TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity style={styles.reorderOk}
                  onPress={() => { setTimers(reorderList); setShowReorder(false); }}>
                  <Text style={{ color: COLORS.white, fontFamily: 'GowunDodum', fontWeight: '700' }}>확인</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reorderOk, { backgroundColor: COLORS.starGray }]}
                  onPress={() => setShowReorder(false)}>
                  <Text style={{ color: COLORS.white, fontFamily: 'GowunDodum', fontWeight: '700' }}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgPink },
  container: { flex: 1, backgroundColor: COLORS.bgPink, paddingHorizontal: 16, maxWidth: 400, alignSelf: 'center', width: '100%' },
  homeBtn: { marginTop: 12, backgroundColor: '#D8E8F0', paddingHorizontal: 14, paddingVertical: 6, borderRadius: SIZES.radiusSm, alignSelf: 'flex-start' },
  homeBtnText: { fontSize: 16, fontFamily: 'RumRaisin', color: COLORS.textBrown },
  dateWrap: { height: 90, alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 4 },
  dateText: { fontSize: 80, fontFamily: 'RumRaisin', color: COLORS.accentOrange, zIndex: 1 },
  goalLabel: { fontSize: 20, fontFamily: 'RumRaisin', color: COLORS.accentOrange, marginTop: 6, marginBottom: 8 },
  goalBadgeWrap: { width: '100%', borderWidth: 2, borderColor: COLORS.accentOrange, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.white, paddingVertical: 10, marginBottom: 10, overflow: 'hidden' },
  goalBadgeInner: { paddingHorizontal: 20, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  goalBadgeText: { fontSize: 16, fontWeight: '700', color: '#5B8C3E', textAlign: 'center' },
  timerContainer: { flex: 1, backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, borderWidth: 2, borderColor: COLORS.accentPink, padding: 12, marginBottom: 10 },
  reorderBtn: { alignSelf: 'flex-end', marginBottom: 4 },
  reorderText: { fontSize: 12, color: COLORS.textGray, textDecorationLine: 'underline', fontFamily: 'GowunDodum' },
  timerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, marginBottom: 4, borderRadius: SIZES.radiusSm, backgroundColor: COLORS.white },
  timerDone: { backgroundColor: COLORS.runningDone },
  timerNum: { fontSize: 20, fontFamily: 'RumRaisin', color: COLORS.accentOrange, width: 32 },
  timerTime: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.textDark, textAlign: 'center' },
  actionBtn: { padding: 6 },
  pauseIcon: { fontSize: 22 },
  playIcon: { fontSize: 18, color: COLORS.accentRed },
  changeText: { fontSize: 11, color: COLORS.accentRed, marginLeft: 4, fontFamily: 'GowunDodum', textDecorationLine: 'underline' },
  walkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 8 },
  walkDash: { fontSize: 11, color: '#CCC' },
  walkText: { fontSize: 16, color: COLORS.walkTimer, fontWeight: '700', fontFamily: 'RumRaisin' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  changeModal: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 24, width: 280, alignItems: 'center' },
  changeTitle: { fontSize: 20, fontFamily: 'RumRaisin', color: COLORS.textDark, marginBottom: 16 },
  changeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  changeBox: { width: 48, height: 48, borderWidth: 2, borderRadius: SIZES.radiusSm, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  changeLabel: { fontSize: 16, fontWeight: '700', marginHorizontal: 5, color: COLORS.textDark, fontFamily: 'RumRaisin' },
  changeOk: { flex: 1, paddingVertical: 10, borderRadius: SIZES.radiusSm, alignItems: 'center' },
  reorderModal: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 24, width: 300, maxHeight: '70%' },
  reorderTitle: { fontSize: 20, fontFamily: 'RumRaisin', textAlign: 'center', marginBottom: 8, color: COLORS.textDark },
  reorderHint: { fontSize: 12, color: COLORS.textGray, textAlign: 'center', marginBottom: 12, fontFamily: 'GowunDodum' },
  reorderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#EEE' },
  reorderItemText: { fontSize: 15, fontWeight: '600', color: COLORS.textDark },
  reorderArrow: { fontSize: 18, fontWeight: '700', color: COLORS.accentBlue, paddingHorizontal: 4 },
  reorderOk: { flex: 1, backgroundColor: COLORS.accentBlue, borderRadius: SIZES.radiusSm, paddingVertical: 10, alignItems: 'center' },
});
