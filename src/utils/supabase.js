import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pzohvcfcgoihiarmviyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6b2h2Y2ZjZ29paGlhcm12aXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MTIyNzcsImV4cCI6MjA5NDQ4ODI3N30.q1UHEj637xlHADUyqCfsGnMDRgPtLgSgOJi4xrKS-Zo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
