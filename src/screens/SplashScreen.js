import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, Alert, KeyboardAvoidingView, Platform, SafeAreaView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import StarShape from '../components/StarShape';

export default function SplashScreen({ navigation }) {
  const { signIn, signUp } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() { setEmail(''); setPassword(''); }

  async function handleLogin() {
    if (!email || !password) { Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      setShowLogin(false); reset();
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
        Alert.alert('알림', '가입되지 않은 회원이거나\n비밀번호가 틀렸습니다.');
      } else if (msg.includes('Email not confirmed')) {
        Alert.alert('알림', '이메일 인증을 완료해주세요.');
      } else {
        Alert.alert('로그인 실패', msg);
      }
    } finally { setLoading(false); }
  }

  async function handleSignUp() {
    if (!email || !password) { Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.'); return; }
    if (password.length < 6) { Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.'); return; }
    setLoading(true);
    try {
      await signUp(email, password);
      setShowSignUp(false); reset();
      Alert.alert('환영해요! 🎉', '회원가입이 완료됐습니다!');
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('already')) Alert.alert('알림', '이미 존재하는 아이디입니다.');
      else Alert.alert('회원가입 실패', msg);
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* 배경 별들 */}
        <StarShape size={120} color={'#FFA0A0'} style={styles.bgStar1} />
        <StarShape size={80} color={'#FFA600'} style={styles.bgStar2} />
        <StarShape size={65} color={'#D9D9D9'} style={styles.bgStar3} />

        {/* 앱 이름 */}
        <View style={styles.titleWrap}>
          <StarShape size={220} color="#B8D4E8" style={styles.titleStar} />
          <Text style={styles.appName}>{'my own\nspeed'}</Text>
        </View>

        {/* 버튼 영역 */}
        <View style={styles.btnArea}>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => { reset(); setShowLogin(true); }}>
            <Text style={styles.loginBtnText}>login</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { reset(); setShowSignUp(true); }}>
            <Text style={styles.signUpText}>회원가입</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('GuestHome')}>
            <Text style={styles.guestText}>로그인 없이 이용하기</Text>
          </TouchableOpacity>
        </View>

        {/* Login Modal */}
        <Modal visible={showLogin} transparent animationType="fade">
          <View style={styles.overlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={[styles.modalBox, { borderColor: COLORS.borderBlue }]}>
                <TouchableOpacity style={styles.xBtn} onPress={() => { setShowLogin(false); reset(); }}>
                  <Text style={styles.xText}>x</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>login</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.inputEmail }]}
                  placeholder="email" placeholderTextColor="#aaa"
                  value={email} onChangeText={setEmail}
                  autoCapitalize="none" keyboardType="email-address" />
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.inputPassword }]}
                  placeholder="password" placeholderTextColor="#aaa"
                  value={password} onChangeText={setPassword}
                  secureTextEntry />
                <TouchableOpacity
                  style={[styles.okBtn, { backgroundColor: COLORS.accentBlue }]}
                  onPress={handleLogin} disabled={loading}>
                  <Text style={styles.okText}>{loading ? '...' : 'ok'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.forgotWrap}
                  onPress={() => Alert.alert('비밀번호 찾기', 'Settings → 비밀번호 변경에서\n재설정할 수 있어요.')}>
                  <Text style={styles.forgotText}>비밀번호 찾기</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Sign Up Modal */}
        <Modal visible={showSignUp} transparent animationType="fade">
          <View style={styles.overlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={[styles.modalBox, { borderColor: COLORS.borderPink }]}>
                <TouchableOpacity style={styles.xBtn} onPress={() => { setShowSignUp(false); reset(); }}>
                  <Text style={styles.xText}>x</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle]}>sign up</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.inputEmailPink }]}
                  placeholder="email" placeholderTextColor="#aaa"
                  value={email} onChangeText={setEmail}
                  autoCapitalize="none" keyboardType="email-address" />
                <TextInput
                  style={[styles.input, { backgroundColor: COLORS.inputPassword }]}
                  placeholder="password" placeholderTextColor="#aaa"
                  value={password} onChangeText={setPassword}
                  secureTextEntry />
                <TouchableOpacity
                  style={[styles.okBtn, { backgroundColor: COLORS.accentPink }]}
                  onPress={handleSignUp} disabled={loading}>
                  <Text style={styles.okText}>{loading ? '...' : 'ok'}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgCream },
  container: {
    flex: 1, backgroundColor: COLORS.bgCream,
    alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 40, maxWidth: 400,
    alignSelf: 'center', width: '100%',
  },
  bgStar1: { position: 'absolute', top: 60, left: -20, opacity: 0.6 },
  bgStar2: { position: 'absolute', bottom: 180, right: -10, opacity: 0.45 },
  bgStar3: { position: 'absolute', bottom: 80, left: 30, opacity: 0.75 },
  titleWrap: {
    width: 280, height: 300,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  titleStar: { position: 'absolute' },
  appName: {
    fontSize: 80, fontFamily: 'RumRaisin', color: COLORS.textBrown,
    textAlign: 'center', zIndex: 1, lineHeight: 90,
  },
  btnArea: { alignItems: 'center', gap: 18 },
  loginBtn: {
    backgroundColor: COLORS.accentBlue,
    width: 200, paddingVertical: 12,
    borderRadius: SIZES.radiusLg, alignItems: 'center',
  },
  loginBtnText: { color: COLORS.white, fontSize: 40, fontFamily: 'RumRaisin' },
  signUpText: {
    fontSize: 18, fontFamily: 'GowunDodum',
    color: '#FF0000', textDecorationLine: 'underline',
  },
  guestText: {
    fontSize: 13, fontFamily: 'GowunDodum',
    color: '#161515', textDecorationLine: 'underline',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalBox: {
    backgroundColor: '#ffffff', borderWidth: 2, borderRadius: SIZES.radiusMd,
    padding: 28, width: 300, position: 'relative',
  },
  xBtn: { position: 'absolute', top: 10, right: 14 },
  xText: { fontSize: 18, color: COLORS.textDark, fontFamily: 'RumRaisin' },
  modalTitle: { fontSize: 26, fontFamily: 'RumRaisin', textAlign: 'center', marginBottom: 24, color: COLORS.textDark },
  input: {
    borderRadius: SIZES.radiusSm, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 14, fontSize: 15, fontFamily: 'GowunDodum',
  },
  okBtn: { alignSelf: 'center', paddingHorizontal: 40, paddingVertical: 12, borderRadius: SIZES.radiusMd, marginTop: 6 },
  okText: { color: COLORS.white, fontSize: 18, fontFamily: 'RumRaisin' },
  forgotWrap: { marginTop: 16, alignItems: 'center' },
  forgotText: { fontSize: 13, color: COLORS.textGray, textDecorationLine: 'underline', fontFamily: 'GowunDodum' },
});
