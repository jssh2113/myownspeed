import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, SafeAreaView
} from 'react-native';
import { useRun } from '../context/RunContext';
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

function GoalRow({ goal, index, onChange, onRemove, canRemove }) {
  return (
    <View style={styles.goalRow}>
      <TextInput
        style={[styles.timeBox, { borderColor: COLORS.accentOrange }]}
        placeholder="0" keyboardType="numeric" maxLength={2}
        value={goal.h} onChangeText={v => onChange(index, 'h', v)} />
      <Text style={styles.timeLabel}>h</Text>
      <TextInput
        style={[styles.timeBox, { borderColor: COLORS.accentRed }]}
        placeholder="0" keyboardType="numeric" maxLength={2}
        value={goal.m} onChangeText={v => onChange(index, 'm', v)} />
      <Text style={styles.timeLabel}>m</Text>
      <TextInput
        style={[styles.timeBox, { borderColor: COLORS.accentBlue }]}
        placeholder="0" keyboardType="numeric" maxLength={2}
        value={goal.s} onChangeText={v => onChange(index, 's', v)} />
      <Text style={styles.timeLabel}>s</Text>
      <Text style={styles.timesX}>×</Text>
      <TextInput
        style={[styles.timeBox, { borderColor: COLORS.textDark }]}
        placeholder="1" keyboardType="numeric" maxLength={2}
        value={goal.repeat} onChangeText={v => onChange(index, 'repeat', v)} />
      {canRemove && (
        <TouchableOpacity onPress={() => onRemove(index)} style={styles.removeBtn}>
          <Text style={styles.removeTxt}>−</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function RunningGoalScreen({ navigation }) {
  const { setCurrentGoals } = useRun();
  const { user } = useAuth();
  const [goals, setGoals] = useState([{ h: '', m: '', s: '', repeat: '' }]);

  function goHome() {
    if (user) navigation.navigate('Home');
    else navigation.navigate('GuestHome');
  }

  function handleChange(idx, field, val) {
    const next = [...goals];
    next[idx] = { ...next[idx], [field]: val };
    setGoals(next);
  }

  function addGoal() {
    setGoals([...goals, { h: '', m: '', s: '', repeat: '' }]);
  }

  function removeGoal(idx) {
    setGoals(goals.filter((_, i) => i !== idx));
  }

  function handleOk() {
    // 1. 시간이 하나도 없을 때
    const allTimeEmpty = goals.every(g => !g.h && !g.m && !g.s);
    if (allTimeEmpty) {
      Alert.alert('알림', '시간을 입력해주세요!');
      return;
    }

    // 2. 유효한 항목만 필터링
    // repeat가 0이거나 비어있으면서 명시적으로 0을 입력한 경우 제거
    // 시간이 0인 경우도 제거
    const parsed = goals
      .map(g => ({
        h: parseInt(g.h || '0'),
        m: parseInt(g.m || '0'),
        s: parseInt(g.s || '0'),
        repeat: g.repeat === '' ? 1 : parseInt(g.repeat),
      }))
      .filter(g => {
        const totalSec = g.h * 3600 + g.m * 60 + g.s;
        const repeatValid = g.repeat > 0;
        return totalSec > 0 && repeatValid;
      });

    // 3. 유효한 목표가 하나도 없으면 경고
    if (parsed.length === 0) {
      Alert.alert('알림', '유효한 러닝 목표가 없어요!\n횟수(×)가 모두 0이거나\n시간이 입력되지 않았어요.');
      return;
    }

    setCurrentGoals(parsed);
    navigation.navigate('Running');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <TouchableOpacity style={styles.homeBtn} onPress={goHome}>
          <Text style={styles.homeBtnText}>home</Text>
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <WideStar w={280} h={120} color="#C8C8C8" />
          <Text style={styles.title}>running goal</Text>
        </View>

        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {goals.map((g, i) => (
              <GoalRow
                key={i} goal={g} index={i}
                onChange={handleChange}
                onRemove={removeGoal}
                canRemove={goals.length > 1}
              />
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={addGoal}>
              <Text style={styles.addText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>
              {'러닝할 시간,분,초 를 입력하고\n몇 번 반복할 지 입력해주세요!'}
            </Text>
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.okBtn} onPress={handleOk}>
          <Text style={styles.okText}>ok</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgPink },
  container: { flex: 1, backgroundColor: COLORS.bgPink, paddingHorizontal: SIZES.screenPadding, maxWidth: 400, alignSelf: 'center', width: '100%' },
  homeBtn: { marginTop: 16, backgroundColor: '#D8E8F0', paddingHorizontal: 14, paddingVertical: 6, borderRadius: SIZES.radiusSm, alignSelf: 'flex-start' },
  homeBtnText: { fontSize: 16, fontFamily: 'RumRaisin', color: COLORS.textBrown },
  titleWrap: { marginTop: 20, height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  title: { fontSize: 50, fontFamily: 'RumRaisin', color: COLORS.accentPink, zIndex: 1 },
  card: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 24, flex: 1, marginTop: 20, marginBottom: 16 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  timeBox: { width: 48, height: 48, borderWidth: 2, borderRadius: SIZES.radiusSm, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  timeLabel: { fontSize: 16, fontWeight: '700', marginHorizontal: 5, color: COLORS.textDark, fontFamily: 'RumRaisin' },
  timesX: { fontSize: 16, fontWeight: '700', marginHorizontal: 8, color: COLORS.textDark },
  removeBtn: { marginLeft: 10, padding: 4 },
  removeTxt: { fontSize: 22, color: COLORS.accentRed, fontWeight: '700' },
  addBtn: { alignSelf: 'center', marginTop: 4, padding: 8 },
  addText: { fontSize: 30, color: COLORS.textDark, fontWeight: '700' },
  hint: { textAlign: 'center', color: COLORS.textGray, fontSize: 13, marginTop: 10, lineHeight: 20, fontFamily: 'GowunDodum' },
  okBtn: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#CCC', marginBottom: 20 },
  okText: { fontSize: 20, fontFamily: 'RumRaisin', color: COLORS.textDark },
});
