import React from 'react';
import Svg, { Polygon } from 'react-native-svg';

// 홈화면용 가로로 긴 별 (디자인 사진처럼!)
export default function StarShape({ size = 80, color = '#F4A0A0', style, wide = false }) {
  const cx = size / 2;
  const cy = size / 2;

  let points;
  if (wide) {
    // 가로로 넓적한 별 - 디자인 사진처럼
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      // 가로는 넓게, 세로는 좁게
      const rx = i % 2 === 0 ? size * 0.58 : size * 0.22;
      const ry = i % 2 === 0 ? size * 0.38 : size * 0.14;
      pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
    }
    points = pts.join(' ');
  } else {
    // 일반 별
    const outerR = size / 2, innerR = size / 4.2;
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    points = pts.join(' ');
  }

  return (
    <Svg width={size} height={size} style={style}>
      <Polygon points={points} fill={color} />
    </Svg>
  );
}
