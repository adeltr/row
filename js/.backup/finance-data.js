import { supabase } from './supabase.js';

// ── Profile ────────────────────────────────────────────────────

export async function loadProfile() {
  const { data } = await supabase.from('finance_profile').select('*').maybeSingle();
  return data;
}

export async function saveProfile(fields) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('finance_profile')
    .upsert({ user_id: user.id, ...fields }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ── Assets (bank / stocks / crypto / other) ────────────────────

export async function loadAssets(category) {
  const q = supabase.from('finance_assets').select('*');
  if (category) q.eq('category', category);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addAsset(category, name, amount) {
  const { data, error } = await supabase
    .from('finance_assets')
    .insert({ category, name, amount })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAsset(id, fields) {
  const { data, error } = await supabase
    .from('finance_assets')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAsset(id) {
  const { error } = await supabase.from('finance_assets').delete().eq('id', id);
  if (error) throw error;
}

export async function loadAllAssets() {
  const { data, error } = await supabase
    .from('finance_assets')
    .select('*')
    .order('category');
  if (error) throw error;
  // Group by category
  const out = { bank: [], stocks: [], crypto: [], other: [] };
  (data || []).forEach(r => { if (out[r.category]) out[r.category].push(r); });
  return out;
}

// ── Activity log ───────────────────────────────────────────────

export async function loadActivity() {
  const { data, error } = await supabase
    .from('finance_activity')
    .select('*')
    .order('date', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function addActivity(action, details) {
  const { error } = await supabase
    .from('finance_activity')
    .insert({ action, details });
  if (error) throw error;
}

// ── History (net worth snapshots) ─────────────────────────────

export async function loadHistory() {
  const { data, error } = await supabase
    .from('finance_history')
    .select('date, total')
    .order('date');
  if (error) throw error;
  return data;
}

export async function recordHistory(dateStr, total) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('finance_history')
    .upsert(
      { user_id: user.id, date: dateStr, total },
      { onConflict: 'user_id,date' }
    );
  if (error) throw error;
}

// ── Subscriptions ──────────────────────────────────────────────

export async function loadSubs() {
  const { data, error } = await supabase
    .from('finance_subscriptions')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addSub(fields) {
  const { data, error } = await supabase
    .from('finance_subscriptions')
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSub(id, fields) {
  const { data, error } = await supabase
    .from('finance_subscriptions')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSub(id) {
  const { error } = await supabase.from('finance_subscriptions').delete().eq('id', id);
  if (error) throw error;
}

// ── Wishlist ───────────────────────────────────────────────────

export async function loadWishlist() {
  const { data, error } = await supabase
    .from('finance_wishlist')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addWishlistItem(fields) {
  const { data, error } = await supabase
    .from('finance_wishlist')
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWishlistItem(id) {
  const { error } = await supabase.from('finance_wishlist').delete().eq('id', id);
  if (error) throw error;
}

// ── Orders ─────────────────────────────────────────────────────

export async function loadOrders() {
  const { data, error } = await supabase
    .from('finance_orders')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addOrder(fields) {
  const { data, error } = await supabase
    .from('finance_orders')
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrder(id, fields) {
  const { data, error } = await supabase
    .from('finance_orders')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOrder(id) {
  const { error } = await supabase.from('finance_orders').delete().eq('id', id);
  if (error) throw error;
}
