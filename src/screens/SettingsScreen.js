import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, Modal, SafeAreaView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import Svg, { Polygon } from 'react-native-svg';

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

export default function SettingsScreen({ navigation, route }) {
  const { signOut, updatePassword, deleteAccount } = useAuth();
  const [showPwModal, setShowPwModal] = useState(false);
  const [showHelp, setShowHelp] = useState(route?.params?.showHelp || false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  async function handleChangePw() {
    if (!newPw || !confirmPw) { Alert.alert('알림', '비밀번호를 입력해주세요'); return; }
    if (newPw !== confirmPw) { Alert.alert('알림', '비밀번호가 일치하지 않습니다'); return; }
    if (newPw.length < 6) { Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다'); return; }
    try {
      await updatePassword(newPw);
      Alert.alert('완료', '비밀번호가 변경되었습니다');
      setShowPwModal(false); setNewPw(''); setConfirmPw('');
    } catch (e) { Alert.alert('오류', e.message); }
  }

  function handleDelete() {
    Alert.alert('회원 탈퇴', '정말 탈퇴하시겠습니까?\n모든 데이터가 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      { text: '탈퇴', style: 'destructive', onPress: async () => {
        try { await deleteAccount(); }
        catch (e) { Alert.alert('오류', e.message); }
      }}
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* home 버튼 */}
        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeBtnText}>home</Text>
        </TouchableOpacity>

        {/* 타이틀 */}
        <View style={styles.titleWrap}>
          <WideStar w={300} h={120} color="#c7c4c4" />
          <Text style={styles.title}>settings</Text>
        </View>

        {/* 메뉴 카드 */}
        <View style={styles.card}>
          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#C8DFF0' }]} onPress={() => setShowPwModal(true)}>
            <Text style={styles.menuText}>비밀번호 변경</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuBtn, { backgroundColor: COLORS.accentPink }]} onPress={() => setShowHelp(true)}>
            <Text style={[styles.menuText, { color: COLORS.white }]}>사용 방법 안내</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteText}>회원 탈퇴</Text>
        </TouchableOpacity>

        {/* 비밀번호 변경 모달 */}
        <Modal visible={showPwModal} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <TouchableOpacity style={styles.xBtn} onPress={() => { setShowPwModal(false); setNewPw(''); setConfirmPw(''); }}>
                <Text style={styles.xText}>x</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>비밀번호 변경</Text>
              <TextInput style={styles.input} placeholder="새 비밀번호" placeholderTextColor="#aaa" value={newPw} onChangeText={setNewPw} secureTextEntry />
              <TextInput style={styles.input} placeholder="비밀번호 확인" placeholderTextColor="#aaa" value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
              <TouchableOpacity style={styles.okBtn} onPress={handleChangePw}>
                <Text style={styles.okText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 사용 방법 모달 */}
        <Modal visible={showHelp} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={[styles.modal, { maxHeight: '80%' }]}>
              <TouchableOpacity style={styles.xBtn} onPress={() => setShowHelp(false)}>
                <Text style={styles.xText}>x</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>사용 방법 안내</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.helpText}>{HELP_TEXT}</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgGray },
  container: { flex: 1, backgroundColor: COLORS.bgGray, paddingHorizontal: 16, maxWidth: 400, alignSelf: 'center', width: '100%' },
  homeBtn: { marginTop: 12, backgroundColor: '#D8E8F0', paddingHorizontal: 14, paddingVertical: 6, borderRadius: SIZES.radiusSm, alignSelf: 'flex-start' },
  homeBtnText: { fontSize: 16, fontFamily: 'RumRaisin', color: COLORS.textBrown },
  titleWrap: { height: 110, alignItems: 'center', justifyContent: 'center', position: 'relative', marginVertical: 8 },
  title: { fontSize: 50, fontFamily: 'RumRaisin', color: COLORS.textDark, zIndex: 1 },
  card: { backgroundColor: '#FEFAE8', borderRadius: SIZES.radiusMd, padding: 24, gap: 16, marginBottom: 20 },
  menuBtn: { borderRadius: SIZES.radiusMd, paddingVertical: 16, alignItems: 'center' },
  menuText: { fontSize: 16, fontFamily: 'GowunDodum', fontWeight: '700', color: COLORS.textDark },
  signOutBtn: { alignItems: 'center', paddingVertical: 10 },
  signOutText: { fontSize: 14, color: COLORS.textGray, textDecorationLine: 'underline', fontFamily: 'GowunDodum' },
  deleteBtn: { alignItems: 'center', paddingVertical: 10, position: 'absolute', bottom: 30, alignSelf: 'center', left: 0, right: 0 },
  deleteText: { fontSize: 14, color: COLORS.accentRed, textDecorationLine: 'underline', fontWeight: '600', fontFamily: 'GowunDodum' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 24, width: 320, position: 'relative' },
  xBtn: { position: 'absolute', top: 10, right: 14, zIndex: 1 },
  xText: { fontSize: 18, fontFamily: 'RumRaisin', color: COLORS.textDark },
  modalTitle: { fontSize: 20, fontFamily: 'GowunDodum', fontWeight: '800', textAlign: 'center', marginBottom: 16, color: COLORS.textDark },
  input: { borderWidth: 1.5, borderColor: '#CCC', borderRadius: SIZES.radiusSm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12, fontFamily: 'GowunDodum' },
  okBtn: { backgroundColor: COLORS.accentBlue, borderRadius: SIZES.radiusSm, paddingVertical: 12, alignItems: 'center' },
  okText: { color: COLORS.white, fontFamily: 'RumRaisin', fontSize: 16 },
  helpText: { fontSize: 14, color: COLORS.textDark, lineHeight: 24, fontFamily: 'GowunDodum' },
});
