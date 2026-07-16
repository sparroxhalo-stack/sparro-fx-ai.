import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL      = 'https://lrmazikqmrjxfvvwmgzc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybWF6aWtxbXJqeGZ2dndtZ3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzIzNTQsImV4cCI6MjA5OTEwODM1NH0.zrKPKZwsPcRjIxa0ogTsmUyZtJsEdPUHV8dakw1soyU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
