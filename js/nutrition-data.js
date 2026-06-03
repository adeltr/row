import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Nutrition profile ──────────────────────────────────────────

export async function loadProfile() {
  const { data } = await supabase
    .from('nutrition_profile')
    .select('*')
    .maybeSingle();
  return data;
}

export async function upsertProfile(fields) {
  const user_id = await getUserId();
  const { error } = await supabase
    .from('nutrition_profile')
    .upsert({ user_id, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ── Food database ─────────────────────────────────────────────

export async function loadFoods(query, limit = 8) {
  const q = (query || '').trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .or(`name.ilike.%${q}%,aliases.cs.["${q}"]`)
    .order('is_custom', { ascending: true })
    .order('name', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function loadFoodsById(ids) {
  if (!ids || !ids.length) return [];
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .in('id', ids);
  if (error) throw error;
  return data || [];
}

export async function addCustomFood(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('foods')
    .insert({ user_id, is_custom: true, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFood(id, fields) {
  const { data, error } = await supabase
    .from('foods')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFood(id) {
  const { error } = await supabase
    .from('foods')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Meal logs ─────────────────────────────────────────────────

export async function loadDailyLogs(dateStr) {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('date', dateStr)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addMealLog(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('meal_logs')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMealLog(id, fields) {
  const { data, error } = await supabase
    .from('meal_logs')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMealLog(id) {
  const { error } = await supabase
    .from('meal_logs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Quick favorites (top 10 used foods last 30 days) ──────────

export async function getTopUsedFoods(limit = 10) {
  const user_id = await getUserId();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('meal_logs')
    .select('food_id, custom_name')
    .eq('user_id', user_id)
    .gte('date', sinceStr)
    .not('food_id', 'is', null);
  if (error) throw error;

  const counts = {};
  (data || []).forEach(r => {
    counts[r.food_id] = (counts[r.food_id] || 0) + 1;
  });
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  return loadFoodsById(sorted);
}

// ── Weekly summary ────────────────────────────────────────────

export async function loadWeeklyTotals(weekStartStr) {
  const start = new Date(weekStartStr);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endStr = end.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('meal_logs')
    .select('date, calories, protein_g, carbs_g, fat_g')
    .gte('date', weekStartStr)
    .lte('date', endStr)
    .order('date', { ascending: true });
  if (error) throw error;

  const days = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const k = d.toISOString().slice(0, 10);
    days[k] = { date: k, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  }
  (data || []).forEach(r => {
    if (!days[r.date]) return;
    days[r.date].calories  += r.calories  || 0;
    days[r.date].protein_g += r.protein_g || 0;
    days[r.date].carbs_g   += r.carbs_g   || 0;
    days[r.date].fat_g     += r.fat_g     || 0;
  });
  return Object.values(days);
}

// ── Target computation (pure, no Supabase) ───────────────────
// Mifflin-St Jeor BMR + activity multiplier + goal adjustment.
// activityKcal: extra kcal burned today from exercise_logs.

export function computeDailyTargets(profile, activityKcal = 0) {
  if (!profile || !profile.weight_kg || !profile.height_cm || !profile.age) {
    return { calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 67, breakdown: null };
  }

  const w = profile.weight_kg;
  const h = profile.height_cm;
  const a = profile.age;
  const isMale = profile.sex === 'male';

  // Mifflin-St Jeor BMR
  const bmr = isMale
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;

  const activityMultipliers = {
    sedentary:  1.2,
    light:      1.375,
    moderate:   1.55,
    active:     1.725,
    very_active: 1.9
  };
  const multiplier = activityMultipliers[profile.activity_level] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  // Goal adjustment
  const goalAdjustments = { lose: -500, maintain: 0, gain: 300 };
  const goalAdj = goalAdjustments[profile.goal] || 0;

  // Activity bonus from today's exercise
  let actBonus = 0;
  if (activityKcal > 0) {
    actBonus = profile.goal === 'lose'
      ? Math.round(activityKcal * 0.5)
      : Math.round(activityKcal);
  }

  const calories = Math.max(1200, tdee + goalAdj + actBonus);

  // Macro split: 30% protein, 40% carbs, 30% fat (default)
  const protein_g  = profile.protein_target_g || Math.round(calories * 0.30 / 4);
  const carbs_g    = profile.carbs_target_g   || Math.round(calories * 0.40 / 4);
  const fat_g      = profile.fat_target_g     || Math.round(calories * 0.30 / 9);

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    breakdown: { bmr: Math.round(bmr), tdee, goalAdj, actBonus }
  };
}

// ── Realtime ──────────────────────────────────────────────────

export function subscribeNutrition(callback) {
  return supabase
    .channel('meal_logs_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_logs' }, callback)
    .subscribe();
}
