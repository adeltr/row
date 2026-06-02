import { supabase } from './supabase.js';

// ── Goals ──────────────────────────────────────────────────────

export async function loadGoals(dateStr) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('date', dateStr)
    .order('position');
  if (error) throw error;
  return data;
}

export async function loadGoalsBefore(dateStr) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .lt('date', dateStr)
    .eq('done', false)
    .order('date');
  if (error) throw error;
  return data;
}

export async function addGoal(dateStr, text, position) {
  const { data, error } = await supabase
    .from('goals')
    .insert({ date: dateStr, text, position: position ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGoal(id, fields) {
  const { data, error } = await supabase
    .from('goals')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(id) {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function deleteGoalsForDate(dateStr) {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('date', dateStr);
  if (error) throw error;
}

export async function upsertGoals(dateStr, goalsArr) {
  // Replaces all goals for a date — used for rollover.
  await deleteGoalsForDate(dateStr);
  if (!goalsArr.length) return [];
  const rows = goalsArr.map((g, i) => ({
    date: dateStr,
    text: g.text,
    done: g.done ?? false,
    done_at: g.done_at ?? null,
    queued: g.queued ?? false,
    position: i
  }));
  const { data, error } = await supabase
    .from('goals')
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

// ── Streak ─────────────────────────────────────────────────────

export async function loadStreak() {
  const { data } = await supabase
    .from('goal_streaks')
    .select('*')
    .maybeSingle();
  return data ? { count: data.count, lastProcessedDate: data.last_processed_date ?? '' } : { count: 0, lastProcessedDate: '' };
}

export async function saveStreak(count, lastProcessedDate) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('goal_streaks')
    .upsert(
      { user_id: user.id, count, last_processed_date: lastProcessedDate || null },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

// ── Realtime ────────────────────────────────────────────────────

export function subscribeGoals(callback) {
  return supabase
    .channel('goals_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, callback)
    .subscribe();
}
