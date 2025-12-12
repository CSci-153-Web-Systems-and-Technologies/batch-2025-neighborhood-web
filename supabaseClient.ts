// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual project URL and public API key
const supabaseUrl = 'https://oybcpyomhbhhqulrzzfg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95YmNweW9taGJoaHF1bHJ6emZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODUyNTIsImV4cCI6MjA4MDM2MTI1Mn0.liCxl5M5ZlLwPqzofYIWudUsoAPEDMfye-0YQ-3Ecz8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);