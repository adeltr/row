import { supabase } from './supabase.js';

// ── Stack items ────────────────────────────────────────────────

export async function loadItems() {
  const { data, error } = await supabase
    .from('stack_items')
    .select('*')
    .order('position');
  if (error) throw error;
  return data;
}

export async function addItem(fields) {
  const { data, error } = await supabase
    .from('stack_items')
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItem(id, fields) {
  const { data, error } = await supabase
    .from('stack_items')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id) {
  const { error } = await supabase
    .from('stack_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function replaceAllItems(items) {
  const { data: { user } } = await supabase.auth.getUser();
  // Delete all, then re-insert — used for first-time seeding.
  await supabase.from('stack_items').delete().eq('user_id', user.id);
  if (!items.length) return [];
  const rows = items.map((item, i) => ({ ...item, user_id: user.id, position: i }));
  const { data, error } = await supabase.from('stack_items').insert(rows).select();
  if (error) throw error;
  return data;
}

// ── Stack logs (taken per day) ─────────────────────────────────

export async function loadTaken(dateStr) {
  const { data, error } = await supabase
    .from('stack_logs')
    .select('stack_item_id, taken_at')
    .eq('date', dateStr);
  if (error) throw error;
  const map = {};
  (data || []).forEach(r => { map[r.stack_item_id] = r.taken_at; });
  return map;
}

export async function setTaken(stackItemId, dateStr, taken) {
  if (taken) {
    const { error } = await supabase
      .from('stack_logs')
      .upsert(
        { stack_item_id: stackItemId, date: dateStr, taken_at: new Date().toISOString() },
        { onConflict: 'user_id,stack_item_id,date' }
      );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('stack_logs')
      .delete()
      .eq('stack_item_id', stackItemId)
      .eq('date', dateStr);
    if (error) throw error;
  }
}

// ── Realtime ────────────────────────────────────────────────────

export function subscribeItems(callback) {
  return supabase
    .channel('stack_items_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stack_items' }, callback)
    .subscribe();
}

export function subscribeLogs(callback) {
  return supabase
    .channel('stack_logs_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stack_logs' }, callback)
    .subscribe();
}
