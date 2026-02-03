import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = 'https://lqmdxoiuhirscynlojbf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxbWR4b2l1aGlyc2N5bmxvamJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTA1NTEsImV4cCI6MjA4NTQ4NjU1MX0.mcp2iNkig8hnKek1iHoum8owPWOGA6MKbkQMk_BwPjw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
