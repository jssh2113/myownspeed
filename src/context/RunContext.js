import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RunContext = createContext({});

export function RunProvider({ children }) {
  const { user, addPoints } = useAuth();
  const [currentGoals, setCurrentGoals] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  // 진행 중인 세션 저장
  async function saveActiveSession(goals, timers, date) {
    try {
      await AsyncStorage.setItem('activeSession', JSON.stringify({
        goals, timers, date: date instanceof Date ? date.toISOString() : date,
        savedAt: new Date().toISOString(),
      }));
    } catch (e) {}
  }

  // 진행 중인 세션 불러오기
  async function loadActiveSession() {
    try {
      const raw = await AsyncStorage.getItem('activeSession');
      if (!raw) return null;
      const session = JSON.parse(raw);
      // 24시간 지난 건 무시
      const savedAt = new Date(session.savedAt);
      if (new Date() - savedAt > 24 * 60 * 60 * 1000) {
        await AsyncStorage.removeItem('activeSession');
        return null;
      }
      return session;
    } catch (e) { return null; }
  }

  // 진행 중인 세션 삭제
  async function clearActiveSession() {
    try {
      await AsyncStorage.removeItem('activeSession');
    } catch (e) {}
  }

  async function saveSession(date, goals, timers, totalSeconds, completedCount) {
    if (!user) return;
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('running_sessions').select('id')
      .eq('user_id', user.id).eq('date', dateStr).single();
    if (existing) {
      await supabase.from('running_sessions').update({
        goals, timers, total_seconds: totalSeconds,
        completed_count: completedCount, updated_at: new Date().toISOString()
      }).eq('id', existing.id);
    } else {
      await supabase.from('running_sessions').insert({
        user_id: user.id, date: dateStr, goals, timers,
        total_seconds: totalSeconds, completed_count: completedCount
      });
      if (completedCount > 0) await addPoints(2);
    }
  }

  async function getSessionByDate(date) {
    if (!user) return null;
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const { data } = await supabase.from('running_sessions').select('*')
      .eq('user_id', user.id).eq('date', dateStr).single();
    return data;
  }

  async function getSessionsByRange(start, end) {
    if (!user) return [];
    const { data: sessions } = await supabase.from('running_sessions').select('*')
      .eq('user_id', user.id).gte('date', start).lte('date', end).order('date');
    let manuals = [];
    try {
      const { data: manualData } = await supabase.from('manual_records').select('*')
        .eq('user_id', user.id).gte('date', start).lte('date', end).order('date');
      manuals = (manualData || []).filter(m => m.total_seconds && m.total_seconds > 0);
    } catch (e) {}
    const autoSessions = (sessions || []).map(s => ({ ...s, source: 'auto' }));
    const manualSessions = manuals.map(m => ({
      id: m.id, date: m.date, source: 'manual',
      goals: m.goals || [], total_seconds: m.total_seconds || 0, completed_count: 1,
    }));
    return [...autoSessions, ...manualSessions].sort((a, b) => a.date > b.date ? 1 : -1);
  }

  return (
    <RunContext.Provider value={{
      currentGoals, setCurrentGoals,
      activeSession, setActiveSession,
      saveActiveSession, loadActiveSession, clearActiveSession,
      saveSession, getSessionByDate, getSessionsByRange,
    }}>
      {children}
    </RunContext.Provider>
  );
}

export const useRun = () => useContext(RunContext);
