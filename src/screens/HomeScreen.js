import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Modal, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRun } from '../context/RunContext';
import { COLORS, SIZES } from '../constants/theme';
import Svg, { Polygon } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const W = Math.min(width, 430);

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
    <Svg width={w} height={h}>
      <Polygon points={pts.join(' ')} fill={color} />
    </Svg>
  );
}

const HELP_TEXT = `📱 My Own Speed 사용 방법

▶ START!
러닝 목표를 설정합니다.
h/m/s에 시간을 입력하고
× 뒤에 반복 횟수를 적으세요.
+ 버튼으로 여러 목표를 추가할 수 있어요.

⏱ 러닝 화면
설정한 목표대로 타이머가 생성됩니다.
▶를 눌러 시작, ⏸를 눌러 일시정지해요.
러닝 완료 후 걷기 타이머가 자동으로 시작됩니다.
순서변경 버튼으로 러닝 순서를 바꿀 수 있어요.
완료된 러닝은 자동 저장됩니다!

📊 RECORDS
daily : 오늘의 러닝 기록
weekly : 이번 주 날짜별 기록
monthly : 달성률과 스탬프 캘린더
yearly : 월별 총 러닝 시간

🏆 CHALLENGES
친구와 일주일 대결! 3포인트 소비.
이기면 +5pt, 비기면 +3pt

👥 FRIENDS
my code : 내 친구 코드 (6자리)
add friends : 친구 코드 입력으로 추가 (+2pt)

💰 포인트 시스템
회원가입 +5pt / 러닝 완료 +2pt
친구 추가 +2pt / 대결 신청 -3pt
대결 승리 +5pt / 무승부 +3pt`;

export default function HomeScreen({ navigation }) {
  const { profile } = useAuth();
  const { loadActiveSession, setCurrentGoals } = useRun();
  const [showHelp, setShowHelp] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeSession, setResumeSession] = useState(null);

  useEffect(() => {
    checkActiveSession();
  }, []);

  async function checkActiveSession() {
    const session = await loadActiveSession();
    if (session && session.goals && session.timers) {
      const hasRunning = session.timers.some(t => t.state === 'running' || t.state === 'paused');
      if (hasRunning) {
        setResumeSession(session);
        setShowResumeModal(true);
      }
    }
  }

  function handleResume() {
    if (resumeSession) {
      setCurrentGoals(resumeSession.goals);
      setShowResumeModal(false);
      navigation.navigate('Running', { resumeData: resumeSession });
    }
  }

  const stars = [
    { label: 'start!',     color: '#FFE0E0',  textColor: COLORS.accentRed,    screen: 'RunningGoal', left: W*0.06, top: height*0.02,  w: W*0.52, h: height*0.155, fontSize: W*0.12 },
    { label: 'records',    color: COLORS.starBlue,  textColor: '#FFC300', screen: 'Records',     left: W*0.46, top: height*0.14,  w: W*0.50, h: height*0.145, fontSize: W*0.08 },
    { label: 'Challenges', color: COLORS.starPink,  textColor: COLORS.textBrown,    screen: 'Challenges',  left: W*0.04, top: height*0.265, w: W*0.52, h: height*0.15,  fontSize: W*0.08 },
    { label: 'friends',    color: '#F5D78E',        textColor: COLORS.textBrown,    screen: 'Friends',     left: W*0.42, top: height*0.385, w: W*0.50, h: height*0.145, fontSize: W*0.08 },
    { label: 'settings',   color: COLORS.starGray,  textColor: COLORS.textBrown,    screen: 'Settings',    left: W*0.05, top: height*0.505, w: W*0.44, h: height*0.13,  fontSize: W*0.08 },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* 포인트 뱃지 */}
        {profile && (
          <View style={styles.pointBadge}>
            <Text style={styles.pointText}>{profile.points || 0}</Text>
          </View>
        )}

        {/* 타이틀 */}
        <View style={styles.titleWrap}>
          <WideStar w={W * 0.75} h={height * 0.13} color="#B8D4E8" />
          <Text style={styles.titleText}>home</Text>
        </View>

        {/* 메뉴 별들 */}
        <View style={styles.starsArea}>
          {stars.map((s) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.starBtn, { left: s.left, top: s.top, width: s.w, height: s.h }]}
              onPress={() => navigation.navigate(s.screen)}
              activeOpacity={0.8}>
              <WideStar w={s.w} h={s.h} color={s.color} />
              <Text style={[styles.starLabel, { color: s.textColor, fontSize: s.fontSize }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ? 버튼 - 홈에서는 모달로 */}
        <TouchableOpacity style={styles.helpBtn} onPress={() => setShowHelp(true)}>
          <Text style={styles.helpText}>?</Text>
        </TouchableOpacity>

        {/* 진행 중인 세션 복구 모달 */}
        <Modal visible={showResumeModal} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.resumeModal}>
              <Text style={styles.resumeTitle}>진행 중인 러닝이 있어요!</Text>
              <Text style={styles.resumeText}>이어서 계속 하시겠습니까?</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={[styles.resumeBtn, { backgroundColor: COLORS.accentBlue }]} onPress={handleResume}>
                  <Text style={styles.resumeBtnText}>이어하기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.resumeBtn, { backgroundColor: COLORS.starGray }]} onPress={() => setShowResumeModal(false)}>
                  <Text style={styles.resumeBtnText}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 사용 방법 모달 */}
        <Modal visible={showHelp} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.helpModal}>
              <TouchableOpacity style={styles.xBtn} onPress={() => setShowHelp(false)}>
                <Text style={styles.xText}>x</Text>
              </TouchableOpacity>
              <Text style={styles.helpTitle}>사용 방법 안내</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.helpContent}>{HELP_TEXT}</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgCream },
  container: { flex: 1, backgroundColor: COLORS.bgCream, maxWidth: 430, alignSelf: 'center', width: '100%' },
  pointBadge: {
    position: 'absolute', top: height * 0.015, right: W * 0.04,
    backgroundColor: '#FFF5CC', borderRadius: SIZES.radiusFull,
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.accentOrange, zIndex: 10,
  },
  pointText: { fontSize: W * 0.032, fontWeight: '700', color: COLORS.textBrown, fontFamily: 'GowunDodum' },
  titleWrap: { marginTop: height * 0.02, height: height * 0.13, alignItems: 'center', justifyContent: 'center' },
  titleText: { position: 'absolute', fontSize: W * 0.135, fontFamily: 'RumRaisin', color: COLORS.textBrown },
  starsArea: { flex: 1, position: 'relative', marginTop: height * 0.01 },
  starBtn: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  starLabel: { position: 'absolute', fontFamily: 'RumRaisin', fontWeight: '800', textAlign: 'center' },
  helpBtn: {
    position: 'absolute', bottom: height * 0.03, right: W * 0.05,
    width: W * 0.1, height: W * 0.1, borderRadius: W * 0.05,
    backgroundColor: '#DDDDDD', alignItems: 'center', justifyContent: 'center',
  },
  helpText: { fontSize: W * 0.05, fontFamily: 'RumRaisin', color: COLORS.textDark },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  resumeModal: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 24, width: 300, alignItems: 'center' },
  resumeTitle: { fontSize: 18, fontFamily: 'RumRaisin', color: COLORS.textDark, marginBottom: 8, textAlign: 'center' },
  resumeText: { fontSize: 14, fontFamily: 'GowunDodum', color: COLORS.textGray, textAlign: 'center' },
  resumeBtn: { flex: 1, paddingVertical: 10, borderRadius: SIZES.radiusSm, alignItems: 'center' },
  resumeBtnText: { color: COLORS.white, fontFamily: 'GowunDodum', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  helpModal: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd,
    padding: 24, width: W * 0.85, maxHeight: height * 0.75, position: 'relative',
  },
  xBtn: { position: 'absolute', top: 10, right: 14, zIndex: 1 },
  xText: { fontSize: 18, fontFamily: 'RumRaisin', color: COLORS.textDark },
  helpTitle: { fontSize: 20, fontFamily: 'GowunDodum', fontWeight: '800', textAlign: 'center', marginBottom: 16, color: COLORS.textDark },
  helpContent: { fontSize: 14, color: COLORS.textDark, lineHeight: 24, fontFamily: 'GowunDodum' },
});
