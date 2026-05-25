import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

export default function HomeButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.text}>home</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#D8E8F0',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: SIZES.radiusSm, alignSelf: 'flex-start',
  },
  text: { fontSize: 16, fontFamily: 'RumRaisin', color: COLORS.textBrown },
});
