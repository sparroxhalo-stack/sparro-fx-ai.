import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

// Change this to your admin password
const ADMIN_PASSWORD = '2222';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkPremium(session.user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkPremium(session.user);
      else setIsPremium(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkPremium = async (u) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', u.id)
        .single();
      setIsPremium(data?.is_premium ?? false);
    } catch {
      // If profiles table doesn't exist yet, default to false
      setIsPremium(false);
    }
  };

  const signIn = async (email, password) => {
    // Allow admin bypass
    if (password === ADMIN_PASSWORD) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: ADMIN_PASSWORD });
      if (!error) { setIsPremium(true); return { error: null }; }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsPremium(false);
  };

  const upgradeToPremium = async () => {
    if (!user) return;
    try {
      await supabase.from('profiles').upsert({ id: user.id, is_premium: true });
      setIsPremium(true);
    } catch (e) {
      console.warn('upgradeToPremium error:', e.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isPremium, signIn, signUp, signOut, upgradeToPremium }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
