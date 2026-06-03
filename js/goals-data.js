import { supabase } from './supabase.js';

// ── Helper ─────────────────────────────────────────────────────
async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

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

export async function addGoal(dateStr, text, position, extras) {
  const user_id = await getUserId();
  const row = { user_id, date: dateStr, text, position: position ?? 0 };
  if (extras && extras.linked_monthly_id) row.linked_monthly_id = extras.linked_monthly_id;
  if (extras && extras.linked_yearly_id)  row.linked_yearly_id  = extras.linked_yearly_id;
  const { data, error } = await supabase
    .from('goals')
    .insert(row)
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
  const user_id = await getUserId();
  const rows = goalsArr.map((g, i) => ({
    user_id,
    date: dateStr,
    text: g.text,
    done: g.done ?? false,
    done_at: g.done_at ?? null,
    queued: g.queued ?? false,
    position: i,
    linked_monthly_id: g.linked_monthly_id ?? null,
    linked_yearly_id:  g.linked_yearly_id  ?? null,
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
  const user_id = await getUserId();
  const { error } = await supabase
    .from('goal_streaks')
    .upsert(
      { user_id, count, last_processed_date: lastProcessedDate || null },
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
