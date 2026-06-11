import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Entries ────────────────────────────────────────────────────────────────

export async function loadEntries(month, year) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('cash_flow_entries')
    .select('*')
    .eq('user_id', user_id)
    .eq('month', month)
    .eq('year', year)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addEntry(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('cash_flow_entries')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntry(id, fields) {
  const { data, error } = await supabase
    .from('cash_flow_entries')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(id) {
  const { error } = await supabase
    .from('cash_flow_entries')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Snapshots ──────────────────────────────────────────────────────────────

export async function loadMonthlySnapshot(month, year) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('cash_flow_monthly_snapshots')
    .select('*')
    .eq('user_id', user_id)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function computeMonthlySnapshot(month, year) {
  const user_id = await getUserId();
  const entries = await loadEntries(month, year);
  const income = entries.filter(e => e.direction === 'income');
  const expenses = entries.filter(e => e.direction === 'expense');
  const total_income = income.reduce((s, e) => s + Number(e.amount), 0);
  const total_expenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const net_savings = total_income - total_expenses;
  const savings_rate = total_income > 0 ? (net_savings / total_income) * 100 : 0;
  const breakdown = computeCategoryBreakdown(expenses);
  const snapshot = { user_id, month, year, total_income, total_expenses, net_savings, savings_rate, breakdown };
  const { data, error } = await supabase
    .from('cash_flow_monthly_snapshots')
    .upsert(snapshot, { onConflict: 'user_id,month,year' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function loadSnapshotHistory(numMonths) {
  const user_id = await getUserId();
  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  const pairs = [];
  for (let i = 0; i < numMonths; i++) {
    pairs.push({ month, year });
    month--;
    if (month === 0) { month = 12; year--; }
  }
  const results = [];
  for (const { month: m, year: y } of pairs.reverse()) {
    const { data } = await supabase
      .from('cash_flow_monthly_snapshots')
      .select('*')
      .eq('user_id', user_id)
      .eq('month', m)
      .eq('year', y)
      .maybeSingle();
    results.push(data || { month: m, year: y, total_income: 0, total_expenses: 0, net_savings: 0, savings_rate: 0, breakdown: {} });
  }
  return results;
}

// ── Analytics (pure) ───────────────────────────────────────────────────────

export function computeSavingsRate(income, expenses) {
  if (!income || income <= 0) return 0;
  return Math.round(((income - expenses) / income) * 100);
}

export function computeCategoryBreakdown(entries) {
  const breakdown = {};
  for (const e of entries) {
    if (e.direction !== 'expense') continue;
    breakdown[e.category] = (breakdown[e.category] || 0) + Number(e.amount);
  }
  return breakdown;
}

export function computeTopCategories(breakdown, limit = 5) {
  return Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, total]) => ({ category, total }));
}

export function compareToLastMonth(current, previous) {
  if (!previous) return null;
  return {
    income_delta:   Number(current.total_income)   - Number(previous.total_income),
    expense_delta:  Number(current.total_expenses)  - Number(previous.total_expenses),
    savings_delta:  Number(current.net_savings)     - Number(previous.net_savings),
    savings_rate_delta: Number(current.savings_rate) - Number(previous.savings_rate),
  };
}

// ── Realtime ───────────────────────────────────────────────────────────────

export function subscribeCashFlow(callback) {
  return supabase
    .channel('cashflow-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_flow_entries' }, callback)
    .subscribe();
}
