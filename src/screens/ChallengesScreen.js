import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Modal, Alert, SafeAreaView
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

async function getRunDays(userId, startDate, endDate) {
  const { data } = await supabase
    .from('running_sessions')
    .select('date')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);
  return (data || []).map(r => r.date);
}

function getChallengeDays(startDate) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function ChallengeItem({ challenge, user }) {
  const [myRunDays, setMyRunDays] = useState([]);
  const [opponentRunDays, setOpponentRunDays] = useState([]);
  const [opponentName, setOpponentName] = useState('');

  const loadData = useCallback(async () => {
    const opponentId = challenge.challenger_id === user.id
      ? challenge.opponent_id
      : challenge.challenger_id;

    const { data: opponentProfile } = await supabase
      .from('profiles').select('email,nickname').eq('id', opponentId).single();
    if (opponentProfile) {
      setOpponentName(opponentProfile.nickname || opponentProfile.email.split('@')[0]);
    }

    const myDays = await getRunDays(user.id, challenge.start_date, challenge.end_date);
    setMyRunDays(myDays);

    const opDays = await getRunDays(opponentId, challenge.start_date, challenge.end_date);
    setOpponentRunDays(opDays);
  }, [challenge, user]);

  useEffect(() => {
    loadData();

    // 실시간 구독 - 러닝 기록 변경 시 자동 업데이트
    const subscription = supabase
      .channel(`challenge-${challenge.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'running_sessions',
      }, () => { loadData(); })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [loadData]);

  const days = getChallengeDays(challenge.start_date);

  return (
    <View style={styles.challengeItem}>
      {/* 상대방 별 */}
      <View style={styles.challengeRow}>
        <Text style={styles.challengeName}>{opponentName}</Text>
        <View style={styles.starsRow}>
          {days.map((day, j) => (
            <Text key={j} style={[styles.starIcon, { color: opponentRunDays.includes(day) ? '#F5A623' : '#CCCCCC' }]}>
              {'★'}
            </Text>
          ))}
        </View>
      </View>

      {/* 내 별 */}
      <View style={styles.challengeRow}>
        <Text style={styles.challengeName}>me</Text>
        <View style={styles.starsRow}>
          {days.map((day, j) => (
            <Text key={j} style={{ fontSize: 18, marginRight: 2, width: 22, textAlign: 'center', color: myRunDays.includes(day) ? '#F5A623' : '#CCCCCC' }}>
              ★
            </Text>
          ))}

        </View>
      </View>

      <Text style={styles.challengePeriod}>
        {challenge.start_date} ~ {challenge.end_date}
      </Text>
    </View>
  );
}

export default function ChallengesScreen({ navigation }) {
  const { user, profile, addPoints } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();

    // 실시간 구독 - challenges 변경 시 자동 업데이트
    if (!user) return;
    const subscription = supabase
      .channel('challenges-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'challenges',
        filter: `challenger_id=eq.${user.id}`,
      }, () => loadData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'challenges',
        filter: `opponent_id=eq.${user.id}`,
      }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [user]);

  async function loadData() {
    if (!user) return;
    const { data: cs } = await supabase.from('challenges').select('*')
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    setChallenges(cs || []);

    const { data: fr } = await supabase.from('friends')
      .select('*, friend:profiles!friends_friend_id_fkey(id,email,friend_code,nickname)')
      .eq('user_id', user.id);
    setFriends(fr || []);
  }

  async function startChallenge() {
    if (!selectedFriend) { Alert.alert('알림', '친구를 선택해주세요'); return; }
    if ((profile?.points || 0) < 3) { Alert.alert('포인트 부족', '대결에는 3포인트가 필요합니다'); return; }
    setLoading(true);
    const start = new Date();
    const end = new Date(start); end.setDate(start.getDate() + 7);
    try {
      await supabase.from('challenges').insert({
        challenger_id: user.id,
        opponent_id: selectedFriend.friend.id,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        status: 'active',
      });
      await addPoints(-3);
      setShowAdd(false); setSelectedFriend(null); loadData();
    } catch (e) { Alert.alert('오류', e.message); }
    finally { setLoading(false); }
  }

  function formatDate(d) {
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  }

  const today = new Date();
  const endDay = new Date(today); endDay.setDate(today.getDate() + 7);
  const activeChallenges = challenges.filter(c => c.status === 'active');
  const pastChallenges = challenges.filter(c => c.status === 'completed');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <View style={styles.topRow}>
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.homeBtnText}>home</Text>
          </TouchableOpacity>
          <View style={styles.pointBadge}>
            <Text style={styles.pointText}>⭐ {profile?.points || 0}pt</Text>
          </View>
        </View>

        <View style={styles.titleWrap}>
          <WideStar w={280} h={110} color={COLORS.starPink} />
          <Text style={styles.title}>Challenges</Text>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.box}>
            <View style={styles.boxHeader}>
              <Text style={styles.boxTitle}>대결하기</Text>
              <TouchableOpacity style={styles.qBtn} onPress={() => setShowHelp(true)}>
                <Text style={styles.qText}>?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.plusBtn} onPress={() => setShowAdd(true)}>
                <Text style={styles.plusText}>+</Text>
              </TouchableOpacity>
            </View>

            {activeChallenges.length === 0 ? (
              <Text style={styles.emptyText}>진행 중인 대결이 없습니다</Text>
            ) : (
              <>
                <Text style={styles.sectionLabel}>진행 중</Text>
                {activeChallenges.map((c, i) => (
                  <ChallengeItem key={i} challenge={c} user={user} />
                ))}
              </>
            )}
          </View>

          <View style={[styles.box, { marginTop: 12 }]}>
            <Text style={styles.boxTitle}>기록</Text>
            <View style={styles.recordHeader}>
              <Text style={styles.recordHeaderText}>vs</Text>
              <Text style={styles.recordHeaderText}>날짜/승패</Text>
            </View>
            {pastChallenges.length === 0 ? (
              <Text style={styles.emptyText}>아직 완료된 대결이 없어요</Text>
            ) : (
              pastChallenges.map((c, i) => (
                <View key={i} style={styles.recordRow}>
                  <Text style={styles.recordName}>상대</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.recordDate}>{c.start_date}-{c.end_date}</Text>
                    <Text style={[styles.recordResult, {
                      color: c.result === 'win' ? COLORS.accentRed
                        : c.result === 'draw' ? COLORS.accentOrange
                        : COLORS.textGray
                    }]}>
                      {c.result === 'win' ? 'win!' : c.result === 'draw' ? 'draw' : 'lose'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <Modal visible={showHelp} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.helpModal}>
              <TouchableOpacity style={styles.xBtn} onPress={() => setShowHelp(false)}>
                <Text style={styles.xText}>x</Text>
              </TouchableOpacity>
              <Text style={styles.helpTitle}>대결 안내</Text>
              <Text style={styles.helpContent}>
                {'대결을 위해서는 3 포인트가 필요합니다.\n\n일주일간 친구와의 대결을 통해\n이기면 포인트 5점\n비기면 친구와 나 모두 3점씩 얻게 됩니다\n\n승패는 일주일 간 러닝한 날의 수로 결정됩니다'}
              </Text>
            </View>
          </View>
        </Modal>

        <Modal visible={showAdd} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.addModal}>
              <TouchableOpacity style={styles.xBtn} onPress={() => { setShowAdd(false); setSelectedFriend(null); }}>
                <Text style={styles.xText}>x</Text>
              </TouchableOpacity>
              <Text style={styles.addTitle}>대결할 친구</Text>
              <ScrollView style={styles.friendList}>
                {friends.length === 0 ? (
                  <Text style={styles.emptyText}>친구를 먼저 추가해주세요</Text>
                ) : (
                  friends.map((f, i) => (
                    <TouchableOpacity key={i}
                      style={[styles.friendItem, selectedFriend?.id === f.id && styles.friendItemSelected]}
                      onPress={() => setSelectedFriend(f)}>
                      <Text style={styles.friendEmail}>
                        {f.friend?.nickname || f.friend?.email?.split('@')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <Text style={styles.periodLabel}>기간</Text>
              <View style={styles.periodBox}>
                <Text style={styles.periodText}>{formatDate(today)}-{formatDate(endDay)}</Text>
              </View>
              <TouchableOpacity style={styles.okBtn} onPress={startChallenge} disabled={loading}>
                <Text style={styles.okText}>ok</Text>
              </TouchableOpacity>
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  homeBtn: { backgroundColor: '#D8E8F0', paddingHorizontal: 14, paddingVertical: 6, borderRadius: SIZES.radiusSm },
  homeBtnText: { fontSize: 16, fontFamily: 'RumRaisin', color: COLORS.textBrown },
  pointBadge: { height: 44, borderRadius: 22, backgroundColor: '#FFF5CC', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.accentOrange, paddingHorizontal: 10 },
  pointText: { fontWeight: '800', fontSize: 16, color: COLORS.textBrown, fontFamily: 'GowunDodum' },
  titleWrap: { height: 110, alignItems: 'center', justifyContent: 'center', position: 'relative', marginVertical: 6 },
  title: { fontSize: 50, fontFamily: 'RumRaisin', color: COLORS.textBrown, zIndex: 1 },
  box: { backgroundColor: '#FEFAE8', borderRadius: SIZES.radiusMd, padding: 16 },
  boxHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  boxTitle: { fontSize: 18, fontFamily: 'GowunDodum', fontWeight: '800', color: COLORS.textDark, flex: 1 },
  sectionLabel: { fontSize: 14, fontFamily: 'GowunDodum', color: COLORS.textGray, marginBottom: 8 },
  qBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  qText: { fontSize: 12, fontFamily: 'RumRaisin' },
  plusBtn: { padding: 4 },
  plusText: { fontSize: 22, fontWeight: '700', color: COLORS.textDark },
  challengeItem: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#EEE' },
  challengeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  challengeName: { fontSize: 14, fontFamily: 'GowunDodum', fontWeight: '700', color: COLORS.textDark, width: 50 },
  starsRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  starIcon: { fontSize: 18, marginRight: 2, width: 22, textAlign: 'center' },
  meLabel: { fontSize: 11, color: COLORS.textGray, marginLeft: 4, fontFamily: 'GowunDodum' },
  challengePeriod: { fontSize: 11, color: COLORS.textGray, fontFamily: 'GowunDodum', marginTop: 4 },
  emptyText: { color: COLORS.textGray, fontSize: 13, textAlign: 'center', paddingVertical: 10, fontFamily: 'GowunDodum' },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderColor: '#EEE' },
  recordHeaderText: { fontSize: 13, fontWeight: '700', color: COLORS.textGray, fontFamily: 'GowunDodum' },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#EEE' },
  recordName: { fontSize: 16, fontFamily: 'GowunDodum', fontWeight: '700', color: COLORS.textDark },
  recordDate: { fontSize: 11, color: COLORS.textGray, fontFamily: 'GowunDodum' },
  recordResult: { fontSize: 15, fontFamily: 'RumRaisin', fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  helpModal: { backgroundColor: '#FEFAE8', borderRadius: SIZES.radiusMd, padding: 24, width: 300, position: 'relative' },
  helpTitle: { fontSize: 20, fontFamily: 'RumRaisin', textAlign: 'center', marginBottom: 12, color: COLORS.textDark },
  helpContent: { fontSize: 14, color: COLORS.textDark, lineHeight: 22, fontFamily: 'GowunDodum' },
  addModal: { backgroundColor: '#FEFAE8', borderRadius: SIZES.radiusMd, padding: 24, width: 300, position: 'relative' },
  addTitle: { fontSize: 18, fontFamily: 'GowunDodum', fontWeight: '800', textAlign: 'center', marginBottom: 12, color: COLORS.textDark },
  friendList: { maxHeight: 150, backgroundColor: '#EEE', borderRadius: SIZES.radiusSm, marginBottom: 16 },
  friendItem: { padding: 12, borderBottomWidth: 1, borderColor: '#DDD' },
  friendItemSelected: { backgroundColor: COLORS.accentBlue + '33' },
  friendEmail: { fontSize: 14, color: COLORS.textDark, fontFamily: 'GowunDodum' },
  periodLabel: { fontSize: 15, fontFamily: 'GowunDodum', fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  periodBox: { backgroundColor: '#EEE', borderRadius: SIZES.radiusSm, padding: 12, marginBottom: 16 },
  periodText: { fontSize: 15, color: COLORS.textDark, fontFamily: 'GowunDodum' },
  okBtn: { backgroundColor: COLORS.accentBlue, borderRadius: SIZES.radiusSm, paddingVertical: 12, alignItems: 'center' },
  okText: { color: COLORS.white, fontFamily: 'RumRaisin', fontSize: 16 },
  xBtn: { position: 'absolute', top: 10, right: 14 },
  xText: { fontSize: 18, color: COLORS.textDark, fontFamily: 'RumRaisin' },
});
