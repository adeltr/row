import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Habits ────────────────────────────────────────────────────────────────────

export async function loadHabits() {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('order_index')
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addHabit(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHabit(id, fields) {
  const { data, error } = await supabase
    .from('habits')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHabit(id) {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Habit Logs ────────────────────────────────────────────────────────────────

export async function loadHabitLogs(startDate, endDate) {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');
  if (error) throw error;
  return data;
}

export async function toggleHabitLog(habitId, dateStr, completed) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(
      { user_id, habit_id: habitId, date: dateStr, completed },
      { onConflict: 'habit_id,date' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHabitLog(habitId, dateStr, fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(
      { user_id, habit_id: habitId, date: dateStr, ...fields },
      { onConflict: 'habit_id,date' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Day Notes ─────────────────────────────────────────────────────────────────

export async function loadDayNote(dateStr) {
  const { data, error } = await supabase
    .from('day_notes')
    .select('*')
    .eq('date', dateStr)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveDayNote(dateStr, note) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('day_notes')
    .upsert(
      { user_id, date: dateStr, note },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDayNote(dateStr) {
  const user_id = await getUserId();
  const { error } = await supabase
    .from('day_notes')
    .delete()
    .eq('user_id', user_id)
    .eq('date', dateStr);
  if (error) throw error;
}

export async function loadDayNotes(startDate, endDate) {
  const { data, error } = await supabase
    .from('day_notes')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');
  if (error) throw error;
  return data;
}

// ── Challenges ────────────────────────────────────────────────────────────────

export async function loadActiveChallenges() {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('status', 'active')
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function loadAllChallenges() {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addChallenge(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('challenges')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateChallenge(id, fields) {
  const { data, error } = await supabase
    .from('challenges')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Streak helpers ────────────────────────────────────────────────────────────

export function computeStreak(habitId, logs, strict) {
  const pad2 = n => String(n).padStart(2, '0');
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());

  const completedDates = new Set(
    logs
      .filter(l => l.habit_id === habitId && l.completed)
      .map(l => l.date)
  );

  let streak = 0;
  const d = new Date(today);
  // allow today to not be checked yet without breaking streak
  if (!completedDates.has(todayStr)) d.setDate(d.getDate() - 1);

  while (true) {
    const s = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    if (!completedDates.has(s)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeHabits(callback) {
  return supabase
    .channel('habits_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs' }, callback)
    .subscribe();
}

export function subscribeChallenges(callback) {
  return supabase
    .channel('challenges_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, callback)
    .subscribe();
}
