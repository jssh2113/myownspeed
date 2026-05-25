import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert
} from 'react-native';
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
    <Svg width={w} height={h}>
      <Polygon points={pts.join(' ')} fill={color} />
    </Svg>
  );
}

export default function GuestHomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* 타이틀 */}
        <View style={styles.titleWrap}>

        </View>

        {/* 게스트 안내 */}
        <View style={styles.guestBanner}>
          <Text style={styles.guestBannerText}>👤 로그인 없이 이용 중</Text>
          <Text style={styles.guestBannerSub}>기록은 저장되지 않아요</Text>
        </View>


        {/* start! 버튼 */}
        <TouchableOpacity
          style={styles.starBtn}
          onPress={() => navigation.navigate('RunningGoal')}
          activeOpacity={0.8}>
          <WideStar w={220} h={140} color={COLORS.starPink} />
          <Text style={styles.starLabel}>start!</Text>
        </TouchableOpacity>
        


        {/* 로그인 유도 */}
        <TouchableOpacity
          style={styles.loginNudge}
          onPress={() => navigation.navigate('Splash')}>
          <Text style={styles.loginNudgeText}>로그인하고 기록을 저장해보세요 →</Text>
        </TouchableOpacity>

        {/* ? 버튼 */}
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => Alert.alert(
            '사용 방법',
            '▶ START!\n러닝 목표를 설정하고 타이머를 시작해요.\n\n⚠️ 로그인 없이는 기록이 저장되지 않아요.\n로그인하면 모든 기능을 이용할 수 있어요!'
          )}>
          <Text style={styles.helpText}>?</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgCream },
  container: {
    flex: 1, backgroundColor: COLORS.bgCream,
    alignItems: 'center', maxWidth: 400,
    alignSelf: 'center', width: '100%',
  },
  titleWrap: {
    marginTop: 50, height: 70,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  titleText: {
    position: 'absolute', fontSize: 70,
    fontFamily: 'RumRaisin', color: COLORS.textBrown,
  },
  guestBanner: {
    backgroundColor: '#FFF5CC', borderRadius: SIZES.radiusMd,
    paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1.5, borderColor: COLORS.accentOrange,
    alignItems: 'center', marginTop: 20,
  },
  guestBannerText: { fontSize: 15, fontFamily: 'GowunDodum', color: COLORS.textBrown, fontWeight: '700' },
  guestBannerSub: { fontSize: 12, fontFamily: 'GowunDodum', color: COLORS.textGray, marginTop: 2 },
  starBtn: {
    marginTop: 50, alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  },
  starLabel: {
    position: 'absolute', fontSize: 50,
    fontFamily: 'RumRaisin', color: COLORS.accentRed,
  },
  loginNudge: { marginTop: 40 },
  loginNudgeText: {
    fontSize: 14, fontFamily: 'GowunDodum',
    color: COLORS.accentBlue, textDecorationLine: 'underline',
  },
  helpBtn: {
    position: 'absolute', bottom: 30, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#DDDDDD', alignItems: 'center', justifyContent: 'center',
  },
  helpText: { fontSize: 20, fontFamily: 'RumRaisin', color: COLORS.textDark },
});
