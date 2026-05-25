import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert, Modal, SafeAreaView, Dimensions
} from 'react-native';
import { useRun } from '../context/RunContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { COLORS, SIZES } from '../constants/theme';
import Svg, { Polygon, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');
const W = Math.min(width, 430);

const TABS = ['daily', 'weekly', 'monthly', 'yearly'];
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function fmtSec(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function StarIcon({ filled, size = 20 }) {
  const cx = size / 2, cy = size / 2;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? size / 2 : size / 4.5;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return (
    <Svg width={size} height={size}>
      <Polygon points={pts.join(' ')} fill={filled ? '#F5A623' : '#CCCCCC'} />
    </Svg>
  );
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

function GoalDisplay({ goals }) {
  const totalSec = (goals || []).reduce((sum, g) =>
    sum + (g.h * 3600 + g.m * 60 + g.s) * g.repeat, 0);
  return (
    <View>
      {(goals || []).map((g, j) => (
        <View key={j} style={styles.dailyTimeRow}>
          <View style={[styles.dailyTimeBox, { borderColor: COLORS.accentOrange }]}>
            <Text style={styles.dailyTimeText}>{g.h || ''}</Text>
          </View>
          <Text style={styles.dailyTimeLabel}>h</Text>
          <View style={[styles.dailyTimeBox, { borderColor: COLORS.accentRed }]}>
            <Text style={styles.dailyTimeText}>{g.m || ''}</Text>
          </View>
          <Text style={styles.dailyTimeLabel}>m</Text>
          <View style={[styles.dailyTimeBox, { borderColor: COLORS.accentBlue }]}>
            <Text style={styles.dailyTimeText}>{g.s || ''}</Text>
          </View>
          <Text style={styles.dailyTimeLabel}>s</Text>
          <Text style={styles.dailyTimesX}>×</Text>
          <View style={[styles.dailyTimeBox, { borderColor: COLORS.textDark }]}>
            <Text style={styles.dailyTimeText}>{g.repeat}</Text>
          </View>
        </View>
      ))}
      <Text style={styles.dailyTotal}>{fmtSec(totalSec)}</Text>
    </View>
  );
}

function AddGoalRow({ goal, index, onChange, onRemove, canRemove }) {
  return (
    <View style={styles.addGoalRow}>
      <TextInput style={[styles.addTimeBox, { borderColor: COLORS.accentOrange }]}
        placeholder="0" keyboardType="numeric" maxLength={2}
        value={goal.h} onChangeText={v => onChange(index, 'h', v)} />
      <Text style={styles.addTimeLabel}>h</Text>
      <TextInput style={[styles.addTimeBox, { borderColor: COLORS.accentRed }]}
        placeholder="0" keyboardType="numeric" maxLength={2}
        value={goal.m} onChangeText={v => onChange(index, 'm', v)} />
      <Text style={styles.addTimeLabel}>m</Text>
      <TextInput style={[styles.addTimeBox, { borderColor: COLORS.accentBlue }]}
        placeholder="0" keyboardType="numeric" maxLength={2}
        value={goal.s} onChangeText={v => onChange(index, 's', v)} />
      <Text style={styles.addTimeLabel}>s</Text>
      <Text style={styles.addTimesX}>×</Text>
      <TextInput style={[styles.addTimeBox, { borderColor: COLORS.textDark }]}
        placeholder="1" keyboardType="numeric" maxLength={2}
        value={goal.repeat} onChangeText={v => onChange(index, 'repeat', v)} />
      {canRemove && (
        <TouchableOpacity onPress={() => onRemove(index)} style={{ marginLeft: 6 }}>
          <Text style={{ color: COLORS.accentRed, fontSize: 20, fontWeight: '700' }}>−</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// 삭제 확인 커스텀 모달
function ConfirmModal({ visible, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.confirmModal}>
          <Text style={styles.confirmTitle}>기록 삭제</Text>
          <Text style={styles.confirmText}>이 기록을 삭제하시겠습니까?</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: COLORS.accentRed }]} onPress={onConfirm}>
              <Text style={styles.confirmBtnText}>삭제</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: COLORS.starGray }]} onPress={onCancel}>
              <Text style={styles.confirmBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function RecordsScreen({ navigation }) {
  const { getSessionsByRange } = useRun();
  const { user } = useAuth();
  const [tab, setTab] = useState('daily');
  const [dailyDate, setDailyDate] = useState(new Date());
  const [weeklyDate, setWeeklyDate] = useState(new Date());
  const [monthlyDate, setMonthlyDate] = useState(new Date());
  const [yearlyDate, setYearlyDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [manualRecords, setManualRecords] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addGoals, setAddGoals] = useState([{ h: '', m: '', s: '', repeat: '' }]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function getRefDate() {
    if (tab === 'daily') return dailyDate;
    if (tab === 'weekly') return weeklyDate;
    if (tab === 'monthly') return monthlyDate;
    return yearlyDate;
  }

  function setRefDate(d) {
    if (tab === 'daily') setDailyDate(d);
    else if (tab === 'weekly') setWeeklyDate(d);
    else if (tab === 'monthly') setMonthlyDate(d);
    else setYearlyDate(d);
  }

  useEffect(() => { loadData(); }, [tab, dailyDate, weeklyDate, monthlyDate, yearlyDate]);

  async function loadData() {
    const refDate = getRefDate();
    let start, end;
    const d = new Date(refDate);
    if (tab === 'daily') {
      start = end = d.toISOString().split('T')[0];
    } else if (tab === 'weekly') {
      const day = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      start = mon.toISOString().split('T')[0];
      end = sun.toISOString().split('T')[0];
    } else if (tab === 'monthly') {
      start = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
      end = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-31`;
    } else {
      start = `${d.getFullYear()}-01-01`;
      end = `${d.getFullYear()}-12-31`;
    }
    const data = await getSessionsByRange(start, end);
    setSessions(data);
    if (tab === 'daily' && user) {
      const { data: manual } = await supabase.from('manual_records')
        .select('*').eq('user_id', user.id).eq('date', start).order('created_at');
      setManualRecords(manual || []);
    }
  }

  function changeRef(dir) {
    const refDate = getRefDate();
    const d = new Date(refDate);
    if (tab === 'daily') d.setDate(d.getDate() + dir);
    else if (tab === 'weekly') d.setDate(d.getDate() + dir * 7);
    else if (tab === 'monthly') d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    if (d > new Date()) return;
    setRefDate(d);
  }

  function handleAddGoalChange(idx, field, val) {
    const next = [...addGoals];
    next[idx] = { ...next[idx], [field]: val };
    setAddGoals(next);
  }

  async function addManual() {
    const allEmpty = addGoals.every(g => !g.h && !g.m && !g.s);
    if (allEmpty) { Alert.alert('알림', '시간을 입력해주세요'); return; }
    const parsed = addGoals
      .map(g => ({
        h: parseInt(g.h || '0'), m: parseInt(g.m || '0'),
        s: parseInt(g.s || '0'), repeat: g.repeat === '' ? 1 : parseInt(g.repeat),
      }))
      .filter(g => (g.h * 3600 + g.m * 60 + g.s) > 0 && g.repeat > 0);
    if (parsed.length === 0) {
      Alert.alert('알림', '유효한 러닝 목표가 없어요!');
      return;
    }
    const totalSec = parsed.reduce((sum, g) => sum + (g.h * 3600 + g.m * 60 + g.s) * g.repeat, 0);
    const dateStr = dailyDate.toISOString().split('T')[0];
    await supabase.from('manual_records').insert({
      user_id: user.id, date: dateStr,
      content: JSON.stringify(parsed), goals: parsed, total_seconds: totalSec,
    });
    setAddGoals([{ h: '', m: '', s: '', repeat: '' }]);
    setShowAddModal(false);
    loadData();
  }

  function confirmDelete(item) {
    setDeleteTarget(item);
    setShowConfirm(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'session') {
        await supabase.from('running_sessions')
          .delete().eq('id', deleteTarget.id);
      } else {
        await supabase.from('manual_records')
          .delete().eq('id', deleteTarget.id);
      }
    } catch(e) {
      console.log('Delete error:', e);
    }
    setShowConfirm(false);
    setDeleteTarget(null);
    await loadData();
  }

  function headerLabel() {
    const refDate = getRefDate();
    const d = refDate;
    if (tab === 'daily') {
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return `${months[d.getMonth()]} ${d.getDate()}th`;
    }
    if (tab === 'weekly') {
      const day = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return `${mon.getMonth()+1}/${mon.getDate()}~${sun.getMonth()+1}/${sun.getDate()}`;
    }
    if (tab === 'monthly') return MONTHS[d.getMonth()];
    return String(d.getFullYear());
  }

  function parseManualContent(content) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return { type: 'goals', goals: parsed };
    } catch (e) {}
    return { type: 'text', text: content };
  }

  function renderDaily() {
    const autoItems = sessions.filter(s => s.source === 'auto' || !s.source);
    const allItems = [
      ...autoItems.map(s => ({ type: 'session', id: s.id, data: s })),
      ...manualRecords.map(m => ({ type: 'manual', id: m.id, data: m })),
    ];
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        {allItems.length === 0 && (
          <Text style={styles.emptyText}>오늘의 기록이 없어요!</Text>
        )}
        {allItems.map((item, i) => {
          const isSession = item.type === 'session';
          const goals = isSession ? item.data.goals : (() => {
            const p = parseManualContent(item.data.content);
            return p.type === 'goals' ? p.goals : null;
          })();
          return (
            <View key={i} style={styles.dailyBox}>
              {/* x 버튼 */}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => confirmDelete(item)}>
                <Text style={styles.deleteBtnText}>x</Text>
              </TouchableOpacity>
              <Text style={styles.dailyBoxNum}>({i + 1})</Text>
              {goals ? (
                <GoalDisplay goals={goals} />
              ) : (
                <Text style={styles.dailyBoxContent}>{item.data.content}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  }

  function renderWeekly() {
    const d = weeklyDate;
    const day = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
    const days = Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(mon); dd.setDate(mon.getDate() + i); return dd;
    });
    const totalSec = sessions.reduce((s, r) => s + (r.total_seconds || 0), 0);

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.weekRow}>
          {days.slice(0, 4).map((dd, i) => {
            const ds = dd.toISOString().split('T')[0];
            const daySessions = sessions.filter(s => s.date === ds);
            const dayTotal = daySessions.reduce((sum, s) => sum + (s.total_seconds || 0), 0);
            return (
              <View key={i} style={styles.weekCell}>
                <View style={styles.weekCellHeader}>
                  <Text style={styles.weekCellDate}>{dd.getMonth()+1}/{dd.getDate()}</Text>
                </View>
                <View style={styles.weekCellScroll}>
                  {dayTotal > 0 ? (
                    <Text style={styles.weekCellTotal}>{fmtSec(dayTotal)}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
        <View style={[styles.weekRow, { marginTop: 6 }]}>
          {days.slice(4, 7).map((dd, i) => {
            const ds = dd.toISOString().split('T')[0];
            const daySessions = sessions.filter(s => s.date === ds);
            const dayTotal = daySessions.reduce((sum, s) => sum + (s.total_seconds || 0), 0);
            return (
              <View key={i} style={styles.weekCell}>
                <View style={styles.weekCellHeader}>
                  <Text style={styles.weekCellDate}>{dd.getMonth()+1}/{dd.getDate()}</Text>
                </View>
                <View style={styles.weekCellScroll}>
                  {dayTotal > 0 ? (
                    <Text style={styles.weekCellTotal}>{fmtSec(dayTotal)}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
          {/* 합계 */}
          <View style={[styles.weekCell, { borderColor: COLORS.accentBlue }]}>
            <View style={styles.weekCellHeader}>
              <Text style={[styles.weekCellDate, { color: COLORS.accentBlue }]}>Total</Text>
            </View>
            <View style={[styles.weekCellScroll, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 20, color: COLORS.textDark, fontFamily: 'RumRaisin', textAlign: 'center' }}>
                {fmtSec(totalSec)}
              </Text>
              <Text style={{ fontSize: 20, color: COLORS.textGray, fontFamily: 'GowunDodum', textAlign: 'center' }}>
                ({totalSec}s)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderMonthly() {
    const d = monthlyDate;
    const year = d.getFullYear(), month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const runDays = new Set(sessions.map(s => parseInt(s.date.split('-')[2])));
    const totalRuns = sessions.reduce((s, r) => s + (r.completed_count || 0), 0);
    const todayDay = new Date().getDate();
    const daysElapsed = year === new Date().getFullYear() && month === new Date().getMonth()
      ? todayDay : daysInMonth;
    const rate = daysElapsed > 0 ? Math.round((runDays.size / daysElapsed) * 100) : 0;

    // 5열 테이블 - 기획 사진처럼 큰 박스에 선
    const rows = [];
    for (let i = 0; i < daysInMonth; i += 5) {
      rows.push(Array.from({ length: 5 }, (_, j) => i + j + 1).filter(dd => dd <= daysInMonth));
    }

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.monthBigBox}>
          {rows.map((row, ri) => (
            <View key={ri} style={[styles.monthBigRow, ri < rows.length - 1 && styles.monthBigRowBorder]}>
              {Array.from({ length: 5 }, (_, ci) => {
                const day = row[ci];
                return (
                  <View key={ci} style={[styles.monthBigCell, ci < 4 && styles.monthBigCellBorder]}>
                    {day ? (
                      runDays.has(day) ? (
                        <StarIcon filled={true} size={28} />
                      ) : (
                        <Text style={styles.monthDayNum}>{day}</Text>
                      )
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
          <Text style={styles.monthStatText}>총 러닝 수: {totalRuns}회</Text>
          <Text style={styles.monthStatText}>달성률: {rate}%</Text>
        </View>
      </ScrollView>
    );
  }

  function renderYearly() {
    const monthRows = [[0,1,2,3],[4,5,6,7],[8,9,10,11]];
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {monthRows.map((row, ri) => (
          <View key={ri} style={[styles.yearRow, ri > 0 && { marginTop: 6 }]}>
            {row.map(mi => {
              const monthSessions = sessions.filter(s => parseInt(s.date.split('-')[1]) - 1 === mi);
              const total = monthSessions.reduce((s, r) => s + (r.total_seconds || 0), 0);
              return (
                <View key={mi} style={styles.yearCell}>
                  <View style={styles.yearCellHeader}>
                    <Text style={styles.yearCellNum}>{mi + 1}</Text>
                  </View>
                  <View style={styles.yearCellBody}>
                    {total > 0 && (
                      <Text style={styles.yearCellContent}>{fmtSec(total)}{'\n'}({total}s)</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeBtnText}>home</Text>
        </TouchableOpacity>

        <View style={styles.dateRow}>
          <TouchableOpacity onPress={() => changeRef(-1)}>
            <Text style={styles.arrow}>{'<'}</Text>
          </TouchableOpacity>
          <View style={styles.headerWrap}>
            <WideStar w={W * 0.58} h={90} color={tab === 'monthly' ? '#E8E5E5' : '#E8E5E5'} />
            {tab === 'daily' ? (
              <View style={{ alignItems: 'center', zIndex: 1 }}>
                <Text style={styles.headerLabelDaily}>{headerLabel()}</Text>
                <Text style={styles.headerSub}>running record</Text>
              </View>
            ) : tab === 'monthly' ? (
              <Text style={styles.headerLabelMonthly}>{headerLabel()}</Text>
            ) : (
              <Text style={styles.headerLabel}>{headerLabel()}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => changeRef(1)}>
            <Text style={styles.arrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, marginBottom: 8 }}>
          {tab === 'daily' && renderDaily()}
          {tab === 'weekly' && renderWeekly()}
          {tab === 'monthly' && renderMonthly()}
          {tab === 'yearly' && renderYearly()}
        </View>

        {tab === 'daily' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addBtnText}>add</Text>
          </TouchableOpacity>
        )}

        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* add 모달 */}
        <Modal visible={showAddModal} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.addModal}>
              <TouchableOpacity style={styles.xBtn} onPress={() => {
                setShowAddModal(false);
                setAddGoals([{ h: '', m: '', s: '', repeat: '' }]);
              }}>
                <Text style={styles.xText}>x</Text>
              </TouchableOpacity>
              <Text style={styles.addModalTitle}>기록 추가</Text>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {addGoals.map((g, i) => (
                  <AddGoalRow key={i} goal={g} index={i}
                    onChange={handleAddGoalChange}
                    onRemove={idx => setAddGoals(addGoals.filter((_, j) => j !== idx))}
                    canRemove={addGoals.length > 1} />
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.addGoalPlusBtn}
                onPress={() => setAddGoals([...addGoals, { h: '', m: '', s: '', repeat: '' }])}>
                <Text style={styles.addGoalPlusText}>+</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[styles.addOk, { backgroundColor: COLORS.accentBlue }]} onPress={addManual}>
                  <Text style={{ color: COLORS.white, fontFamily: 'RumRaisin', fontSize: 16 }}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addOk, { backgroundColor: COLORS.starGray }]}
                  onPress={() => { setShowAddModal(false); setAddGoals([{ h: '', m: '', s: '', repeat: '' }]); }}>
                  <Text style={{ color: COLORS.white, fontFamily: 'GowunDodum', fontWeight: '700' }}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 삭제 확인 모달 */}
        <ConfirmModal
          visible={showConfirm}
          onConfirm={handleDelete}
          onCancel={() => { setShowConfirm(false); setDeleteTarget(null); }}
        />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgBlue },
  container: { flex: 1, backgroundColor: COLORS.bgBlue, paddingHorizontal: 16, maxWidth: 430, alignSelf: 'center', width: '100%' },
  homeBtn: { marginTop: 12, backgroundColor: '#D8E8F0', paddingHorizontal: 14, paddingVertical: 6, borderRadius: SIZES.radiusSm, alignSelf: 'flex-start' },
  homeBtnText: { fontSize: 16, fontFamily: 'RumRaisin', color: COLORS.textBrown },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  headerWrap: { width: W * 0.6, height: 90, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerLabelDaily: { fontSize: 50, fontFamily: 'RumRaisin', color: COLORS.accentOrange, zIndex: 1 },
  headerSub: { fontSize: 25, fontFamily: 'RumRaisin', color: COLORS.accentOrange, zIndex: 1 },
  headerLabel: { fontSize: 50, fontFamily: 'RumRaisin', color: COLORS.textBrown, zIndex: 1 },
  headerLabelMonthly: { fontSize: 60, fontFamily: 'RumRaisin', color: COLORS.accentOrange, zIndex: 1 },
  arrow: { fontSize: 28, fontWeight: '900', color: COLORS.textBrown, paddingHorizontal: 10 },

  // Daily
  dailyBox: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#DDD', position: 'relative' },
  deleteBtn: { position: 'absolute', top: 8, right: 10, zIndex: 1, padding: 4 },
  deleteBtnText: { fontSize: 16, color: COLORS.textGray, fontWeight: '700', fontFamily: 'RumRaisin' },
  dailyBoxNum: { fontSize: 18, fontFamily: 'RumRaisin', color: COLORS.accentOrange, marginBottom: 8 },
  dailyTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  dailyTimeBox: { width: 32, height: 32, borderWidth: 1.5, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  dailyTimeText: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  dailyTimeLabel: { fontSize: 12, fontWeight: '700', marginHorizontal: 2, color: COLORS.textDark, fontFamily: 'RumRaisin' },
  dailyTimesX: { fontSize: 12, fontWeight: '700', marginHorizontal: 3, color: COLORS.textDark },
  dailyTotal: { fontSize: 17, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', marginTop: 8, fontFamily: 'RumRaisin' },
  dailyBoxContent: { fontSize: 14, color: COLORS.textDark, fontFamily: 'GowunDodum' },

  // Weekly - 고정 높이 + 내부 스크롤
  weekRow: { flexDirection: 'row', gap: 3 },
  weekCell: { flex: 1, backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, borderWidth: 1.5, borderColor: '#CCC', overflow: 'hidden', height: 180 },
  weekCellHeader: { borderBottomWidth: 1.5, borderColor: '#CCC', paddingVertical: 7, alignItems: 'center', backgroundColor: COLORS.white },
  weekCellDate: { fontSize: 18, fontFamily: 'RumRaisin', color: COLORS.textBrown, fontWeight: '800' },
  weekCellScroll: { flex: 1, padding: 4, alignItems: 'center', justifyContent: 'center' },
  weekCellContent: { fontSize: 10, color: COLORS.textDark, fontFamily: 'RumRaisin', lineHeight: 20, textAlign: 'center' },
  weekCellTotal: { fontSize: 30, color: COLORS.accentOrange, fontFamily: 'RumRaisin', marginTop: 4, fontWeight: '700', textAlign: 'center'},

  // Monthly - 큰 박스에 선
  monthBigBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5, borderColor: '#d8cbcb',
    overflow: 'hidden', marginTop: 4,
  },
  monthBigRow: { flexDirection: 'row', height: 52 },
  monthBigRowBorder: { borderBottomWidth: 2, borderColor: '#AACCDD' },
  monthBigCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  monthBigCellBorder: { borderRightWidth: 2, borderColor: '#AACCDD' },
  monthDayNum: { fontSize: 20, fontWeight: '700', color: COLORS.textDark, fontFamily: 'GowunDodum' },
  monthStatText: { fontSize: 18, color: COLORS.textDark, fontWeight: '600', marginBottom: 4, fontFamily: 'GowunDodum' },

  // Yearly
  yearRow: { flexDirection: 'row', gap: 4 },
  yearCell: { flex: 1, backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, borderWidth: 1.5, borderColor: '#CCC', overflow: 'hidden', minHeight: 150 },
  yearCellHeader: { borderBottomWidth: 1.5, borderColor: '#CCC', paddingVertical: 6, alignItems: 'center' },
  yearCellNum: { fontSize: 18, fontFamily: 'RumRaisin', color: COLORS.textBrown, fontWeight: '800' },
  yearCellBody: { padding: 6, flex: 1, alignItems: 'center', justifyContent: 'center'},
  yearCellContent: { fontSize: 18, color: COLORS.textDark, fontFamily: 'RumRaisin', lineHeight: 20 },

  emptyText: { textAlign: 'center', color: COLORS.textGray, marginTop: 40, fontSize: 14, fontFamily: 'GowunDodum' },
  addBtn: { backgroundColor: COLORS.accentBlue, borderRadius: SIZES.radiusMd, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: COLORS.white, fontFamily: 'RumRaisin', fontSize: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: '#E8D8B0', borderRadius: SIZES.radiusSm, overflow: 'hidden', marginBottom: 4 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.accentOrange },
  tabText: { fontSize: 13, fontFamily: 'RumRaisin', color: COLORS.textBrown },
  tabTextActive: { color: COLORS.white },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },

  addModal: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 24, width: 320, position: 'relative' },
  xBtn: { position: 'absolute', top: 10, right: 14, zIndex: 1 },
  xText: { fontSize: 18, fontFamily: 'RumRaisin', color: COLORS.textDark },
  addModalTitle: { fontSize: 18, fontFamily: 'RumRaisin', marginBottom: 16, color: COLORS.textDark, textAlign: 'center' },
  addGoalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  addTimeBox: { width: 38, height: 38, borderWidth: 2, borderRadius: SIZES.radiusSm, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  addTimeLabel: { fontSize: 13, fontWeight: '700', marginHorizontal: 2, color: COLORS.textDark, fontFamily: 'RumRaisin' },
  addTimesX: { fontSize: 13, fontWeight: '700', marginHorizontal: 3, color: COLORS.textDark },
  addGoalPlusBtn: { alignSelf: 'center', padding: 6 },
  addGoalPlusText: { fontSize: 26, color: COLORS.textDark, fontWeight: '700' },
  addOk: { flex: 1, paddingVertical: 10, borderRadius: SIZES.radiusSm, alignItems: 'center' },

  // 삭제 확인 모달
  confirmModal: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 24, width: 280, alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontFamily: 'RumRaisin', color: COLORS.textDark, marginBottom: 10 },
  confirmText: { fontSize: 15, fontFamily: 'GowunDodum', color: COLORS.textDark, textAlign: 'center' },
  confirmBtn: { flex: 1, paddingVertical: 10, borderRadius: SIZES.radiusSm, alignItems: 'center' },
  confirmBtnText: { color: COLORS.white, fontFamily: 'GowunDodum', fontWeight: '700', fontSize: 15 },
});
