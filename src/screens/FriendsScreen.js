import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, SafeAreaView, Modal
} from 'react-native';
import { supabase } from '../utils/supabase';
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

export default function FriendsScreen({ navigation }) {
  const { user, profile, addPoints, refreshProfile } = useAuth();
  const [friends, setFriends] = useState([]);
  const [friendCode, setFriendCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    loadFriends();
    if (profile?.nickname) setNickname(profile.nickname);
  }, [user, profile]);

  async function loadFriends() {
    if (!user) return;

    // 내가 추가한 친구 (user_id = 나)
    const { data: asUser } = await supabase
      .from('friends')
      .select('friend_id, friend:profiles!friends_friend_id_fkey(id,email,nickname)')
      .eq('user_id', user.id);

    // 상대방이 나를 추가한 경우 (friend_id = 나)
    const { data: asFriend } = await supabase
      .from('friends')
      .select('user_id, user:profiles!friends_user_id_fkey(id,email,nickname)')
      .eq('friend_id', user.id);

    // 합치기 - 중복 제거
    const allIds = new Set();
    const combined = [];

    (asUser || []).forEach(f => {
      if (!allIds.has(f.friend_id)) {
        allIds.add(f.friend_id);
        combined.push({ friend_id: f.friend_id, friendProfile: f.friend });
      }
    });

    (asFriend || []).forEach(f => {
      if (!allIds.has(f.user_id)) {
        allIds.add(f.user_id);
        combined.push({ friend_id: f.user_id, friendProfile: f.user });
      }
    });

    setFriends(combined);
  }

  async function addFriend() {
    const code = friendCode.trim();
    if (!code) { Alert.alert('알림', '친구 코드를 입력해주세요'); return; }
    if (code === profile?.friend_code) { Alert.alert('알림', '자신의 코드는 추가할 수 없습니다'); return; }
    setLoading(true);
    try {
      const { data: target } = await supabase
        .from('profiles').select('id,email').eq('friend_code', code).single();
      if (!target) { Alert.alert('알림', '존재하지 않는 코드입니다'); return; }

      const already = friends.find(f => f.friend_id === target.id);
      if (already) { Alert.alert('알림', '이미 친구입니다'); return; }

      // 양방향으로 동시에 추가
      const { error } = await supabase.from('friends').insert([
        { user_id: user.id, friend_id: target.id },
        { user_id: target.id, friend_id: user.id },
      ]);

      if (error) {
        if (error.code === '23505') {
          Alert.alert('알림', '이미 친구입니다');
        } else {
          throw error;
        }
        return;
      }

      await addPoints(2);
      setFriendCode('');
      loadFriends();
      Alert.alert('완료', '친구로 추가했습니다! +2포인트 🎉');
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally { setLoading(false); }
  }

  async function removeFriend(friendId) {
    Alert.alert('친구 삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await supabase.from('friends').delete()
          .eq('user_id', user.id).eq('friend_id', friendId);
        await supabase.from('friends').delete()
          .eq('user_id', friendId).eq('friend_id', user.id);
        loadFriends();
      }}
    ]);
  }

  async function saveNickname() {
    if (!nickname.trim()) { Alert.alert('알림', '닉네임을 입력해주세요'); return; }
    const { error } = await supabase.from('profiles')
      .update({ nickname: nickname.trim() }).eq('id', user.id);
    if (error) { Alert.alert('오류', error.message); return; }
    await refreshProfile();
    setShowNicknameModal(false);
    Alert.alert('완료', '닉네임이 저장됐어요!');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeBtnText}>home</Text>
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <WideStar w={300} h={120} color={COLORS.starYellow} />
          <Text style={styles.title}>friends</Text>
        </View>

        <View style={styles.codeBox}>
          <View style={styles.codeRow}>
            <View>
              <Text style={styles.codeLabel}>my code</Text>
              <Text style={styles.codeValue}>{profile?.friend_code || '------'}</Text>
            </View>
            <TouchableOpacity style={styles.nicknameBtn} onPress={() => setShowNicknameModal(true)}>
              <Text style={styles.nicknameBtnText}>
                {profile?.nickname ? `${profile.nickname}` : '+ 닉네임 설정'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listBox}>
          <Text style={styles.listTitle}>list</Text>
          <ScrollView style={styles.list} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {friends.length === 0 ? (
              <Text style={styles.emptyText}>아직 친구가 없어요{'\n'}코드로 추가해보세요! 👋</Text>
            ) : (
              friends.map((f, i) => (
                <View key={i} style={styles.friendRow}>
                  <Text style={styles.friendName}>
                    {f.friendProfile?.nickname || f.friendProfile?.email?.split('@')[0] || '알 수 없음'}
                  </Text>
                  <TouchableOpacity onPress={() => removeFriend(f.friend_id)} style={styles.removeBtn}>
                    <Text style={styles.removeText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        <View style={styles.addBox}>
          <Text style={styles.addTitle}>add friends</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="친구 코드 6자리"
              placeholderTextColor="#aaa"
              value={friendCode}
              onChangeText={setFriendCode}
              maxLength={6}
              keyboardType="numeric" />
            <TouchableOpacity
              style={[styles.addBtn, loading && { opacity: 0.6 }]}
              onPress={addFriend}
              disabled={loading}>
              <Text style={styles.addBtnText}>추가하기</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showNicknameModal} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.nicknameModal}>
              <TouchableOpacity style={styles.xBtn} onPress={() => setShowNicknameModal(false)}>
                <Text style={styles.xText}>x</Text>
              </TouchableOpacity>
              <Text style={styles.nicknameTitle}>닉네임 설정</Text>
              <TextInput
                style={styles.nicknameInput}
                placeholder="닉네임 입력 (최대 8자)"
                placeholderTextColor="#aaa"
                value={nickname}
                onChangeText={setNickname}
                maxLength={8} />
              <TouchableOpacity style={styles.nicknameOk} onPress={saveNickname}>
                <Text style={styles.nicknameOkText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF9E6' },
  container: { flex: 1, backgroundColor: '#FFF9E6', paddingHorizontal: 16, maxWidth: 400, alignSelf: 'center', width: '100%' },
  homeBtn: { marginTop: 12, backgroundColor: '#D8E8F0', paddingHorizontal: 14, paddingVertical: 6, borderRadius: SIZES.radiusSm, alignSelf: 'flex-start' },
  homeBtnText: { fontSize: 16, fontFamily: 'RumRaisin', color: COLORS.textBrown },
  titleWrap: { height: 100, alignItems: 'center', justifyContent: 'center', position: 'relative', marginVertical: 6 },
  title: { fontSize: 50, fontFamily: 'RumRaisin', color: COLORS.textBrown, zIndex: 1 },
  codeBox: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: COLORS.starYellow },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeLabel: { fontSize: 13, color: COLORS.textGray, marginBottom: 4, fontFamily: 'GowunDodum' },
  codeValue: { fontSize: 30, fontFamily: 'RumRaisin', color: COLORS.textBrown, letterSpacing: 4 },
  nicknameBtn: { backgroundColor: COLORS.accentBlue, paddingHorizontal: 12, paddingVertical: 8, borderRadius: SIZES.radiusSm },
  nicknameBtnText: { color: COLORS.white, fontFamily: 'GowunDodum', fontSize: 12, fontWeight: '700' },
  listBox: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 14, flex: 1, marginBottom: 12, borderWidth: 1.5, borderColor: '#EEE' },
  listTitle: { fontSize: 16, fontFamily: 'RumRaisin', color: COLORS.textBrown, marginBottom: 8 },
  list: { flex: 1 },
  emptyText: { color: COLORS.textGray, fontSize: 13, textAlign: 'center', paddingVertical: 16, lineHeight: 22, fontFamily: 'GowunDodum' },
  friendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EEE' },
  friendName: { fontSize: 15, color: COLORS.textDark, fontWeight: '700', fontFamily: 'GowunDodum' },
  removeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  removeText: { fontSize: 12, color: COLORS.accentRed, fontFamily: 'GowunDodum' },
  addBox: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 14, borderWidth: 1.5, borderColor: '#EEE', marginBottom: 12 },
  addTitle: { fontSize: 16, fontFamily: 'RumRaisin', color: COLORS.textBrown, marginBottom: 10 },
  addRow: { flexDirection: 'row', gap: 8 },
  addInput: { flex: 1, borderWidth: 1.5, borderColor: '#CCC', borderRadius: SIZES.radiusSm, paddingHorizontal: 12, paddingVertical: 8, fontSize: 18, letterSpacing: 4, fontFamily: 'RumRaisin', color: COLORS.textDark },
  addBtn: { backgroundColor: COLORS.accentBlue, borderRadius: SIZES.radiusSm, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: COLORS.white, fontFamily: 'GowunDodum', fontWeight: '700', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  nicknameModal: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 24, width: 300, position: 'relative' },
  xBtn: { position: 'absolute', top: 10, right: 14 },
  xText: { fontSize: 18, fontFamily: 'RumRaisin', color: COLORS.textDark },
  nicknameTitle: { fontSize: 20, fontFamily: 'GowunDodum', fontWeight: '800', textAlign: 'center', marginBottom: 16, color: COLORS.textDark },
  nicknameInput: { borderWidth: 1.5, borderColor: '#CCC', borderRadius: SIZES.radiusSm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 14, fontFamily: 'GowunDodum' },
  nicknameOk: { backgroundColor: COLORS.accentBlue, borderRadius: SIZES.radiusSm, paddingVertical: 12, alignItems: 'center' },
  nicknameOkText: { color: COLORS.white, fontFamily: 'GowunDodum', fontWeight: '700', fontSize: 16 },
});
