import { supabase } from './supabase.js';

// ── Profile ────────────────────────────────────────────────────

export async function loadProfile() {
  const { data } = await supabase
    .from('water_profile')
    .select('*')
    .maybeSingle();
  return data;
}

export async function saveProfile(fields) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('water_profile')
    .upsert({ user_id: user.id, ...fields }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ── Daily log ──────────────────────────────────────────────────

export async function loadLog(dateStr) {
  const { data } = await supabase
    .from('water_logs')
    .select('count')
    .eq('date', dateStr)
    .maybeSingle();
  return data ? data.count : 0;
}

export async function setLogCount(dateStr, count) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('water_logs')
    .upsert(
      { user_id: user.id, date: dateStr, count },
      { onConflict: 'user_id,date' }
    );
  if (error) throw error;
}

export async function incrementLog(dateStr) {
  const current = await loadLog(dateStr);
  await setLogCount(dateStr, current + 1);
  return current + 1;
}

// ── Realtime ────────────────────────────────────────────────────

export function subscribeLog(callback) {
  return supabase
    .channel('water_logs_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'water_logs' }, callback)
    .subscribe();
}
