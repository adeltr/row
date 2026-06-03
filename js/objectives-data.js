import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Monthly Objectives ─────────────────────────────────────────────────────────

export async function loadMonthlyObjectives(year, month) {
  const { data, error } = await supabase
    .from('monthly_objectives')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function loadAllMonthlyObjectives() {
  const { data, error } = await supabase
    .from('monthly_objectives')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addMonthlyObjective(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('monthly_objectives')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMonthlyObjective(id, fields) {
  const { data, error } = await supabase
    .from('monthly_objectives')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMonthlyObjective(id) {
  const { error } = await supabase
    .from('monthly_objectives')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Yearly Objectives ──────────────────────────────────────────────────────────

export async function loadYearlyObjectives(year) {
  const { data, error } = await supabase
    .from('yearly_objectives')
    .select('*')
    .eq('year', year)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function loadAllYearlyObjectives() {
  const { data, error } = await supabase
    .from('yearly_objectives')
    .select('*')
    .order('year', { ascending: false })
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addYearlyObjective(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('yearly_objectives')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateYearlyObjective(id, fields) {
  const { data, error } = await supabase
    .from('yearly_objectives')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteYearlyObjective(id) {
  const { error } = await supabase
    .from('yearly_objectives')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Linked goals helpers ───────────────────────────────────────────────────────

export async function loadGoalsForMonthlyObjective(objectiveId) {
  const { data, error } = await supabase
    .from('goals')
    .select('id, text, done, date')
    .eq('linked_monthly_id', objectiveId)
    .order('date')
    .order('position');
  if (error) throw error;
  return data;
}

export async function loadGoalsForYearlyObjective(objectiveId) {
  const { data, error } = await supabase
    .from('goals')
    .select('id, text, done, date')
    .eq('linked_yearly_id', objectiveId)
    .order('date')
    .order('position');
  if (error) throw error;
  return data;
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeMonthlyObjectives(callback) {
  return supabase
    .channel('monthly_objectives_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_objectives' }, callback)
    .subscribe();
}

export function subscribeYearlyObjectives(callback) {
  return supabase
    .channel('yearly_objectives_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'yearly_objectives' }, callback)
    .subscribe();
}
