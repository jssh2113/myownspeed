import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mountedRef.current) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(uid) {
    try {
      // 트리거로 profile 생성될 때까지 최대 5번 재시도
      let data = null;
      for (let i = 0; i < 5; i++) {
        const result = await supabase
          .from('profiles').select('*').eq('id', uid).single();
        if (result.data) { data = result.data; break; }
        await new Promise(r => setTimeout(r, 600));
      }
      if (mountedRef.current) {
        if (data) setProfile(data);
        setLoading(false);
      }
    } catch (e) {
      console.log('fetchProfile error:', e);
      if (mountedRef.current) setLoading(false);
    }
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: undefined }
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function deleteAccount() {
    if (!user) return;
    await supabase.from('profiles').delete().eq('id', user.id);
    await supabase.auth.signOut();
  }

  async function addPoints(amount) {
    if (!profile || !user) return;
    const newPts = (profile.points || 0) + amount;
    const { error } = await supabase.from('profiles')
      .update({ points: newPts }).eq('id', user.id);
    if (!error && mountedRef.current) {
      setProfile(p => ({ ...p, points: newPts }));
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signUp, signIn, signOut, updatePassword, deleteAccount,
      addPoints, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
