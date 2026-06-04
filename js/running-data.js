import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Pace utilities ─────────────────────────────────────────────────────────

export function parsePaceInput(str) {
  const s = (str || '').trim().replace('/km', '').trim();
  if (!s) return null;
  if (s.includes(':')) {
    const [m, sec] = s.split(':');
    const val = parseInt(m) * 60 + parseInt(sec || 0);
    return isNaN(val) ? null : val;
  }
  const val = parseInt(s);
  return isNaN(val) ? null : val;
}

export function formatPace(sec_per_km) {
  if (!sec_per_km || sec_per_km <= 0) return '—';
  const m = Math.floor(sec_per_km / 60);
  const s = Math.round(sec_per_km % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export function formatDuration(sec) {
  if (!sec || sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

export function parseDurationInput(str) {
  // Accepts "1:02:30", "62:30", "3750" (seconds)
  const s = (str || '').trim();
  const parts = s.split(':');
  if (parts.length === 3) return parseInt(parts[0])*3600 + parseInt(parts[1])*60 + parseInt(parts[2]);
  if (parts.length === 2) return parseInt(parts[0])*60 + parseInt(parts[1]);
  const val = parseInt(s);
  return isNaN(val) ? null : val;
}

export function calcPace(distance_km, duration_sec) {
  if (!distance_km || !duration_sec || distance_km <= 0) return null;
  return Math.round(duration_sec / distance_km);
}

export function calcCalories(weight_kg, distance_km) {
  // MET-based approximation: kcal = weight × distance × 1.036
  if (!weight_kg || !distance_km) return null;
  return Math.round(weight_kg * distance_km * 1.036);
}

// ── Running sessions ───────────────────────────────────────────────────────

export async function loadSessions({ limit = 20, offset = 0, run_type, shoe_id, route_id, from_date, to_date } = {}) {
  let q = supabase
    .from('running_sessions')
    .select(`
      *,
      running_shoes ( id, name, brand ),
      running_routes ( id, name )
    `)
    .order('started_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (run_type) q = q.eq('run_type', run_type);
  if (shoe_id) q = q.eq('shoe_id', shoe_id);
  if (route_id) q = q.eq('route_id', route_id);
  if (from_date) q = q.gte('started_at', from_date);
  if (to_date) q = q.lte('started_at', to_date);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function loadRecentSessions(n = 5) {
  const { data, error } = await supabase
    .from('running_sessions')
    .select('*, running_shoes(id,name), running_routes(id,name)')
    .order('started_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(n);
  if (error) throw error;
  return data || [];
}

export async function loadSession(id) {
  const { data, error } = await supabase
    .from('running_sessions')
    .select('*, running_shoes(id,name,brand), running_routes(id,name,distance_km)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function addSession(fields) {
  const user_id = await getUserId();

  // Auto-calculate calories burned if distance is known and not already provided.
  // Formula: weight_kg × distance_km × 1.036 (Cameron-Hibbert net calorie cost).
  const enriched = { ...fields };
  if (enriched.calories_burned == null && enriched.distance_km) {
    try {
      const { data: profile } = await supabase
        .from('nutrition_profile')
        .select('weight_kg')
        .eq('user_id', user_id)
        .maybeSingle();
      if (profile?.weight_kg) {
        enriched.calories_burned = Math.round(profile.weight_kg * enriched.distance_km * 1.036);
      }
    } catch {}
  }

  const { data, error } = await supabase
    .from('running_sessions')
    .insert({ user_id, ...enriched })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSession(id, fields) {
  const { data, error } = await supabase
    .from('running_sessions')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(id) {
  const { error } = await supabase
    .from('running_sessions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Load sessions for ACWR calculation (last 28 days)
export async function loadSessionsForACWR() {
  const from = new Date();
  from.setDate(from.getDate() - 28);
  const { data, error } = await supabase
    .from('running_sessions')
    .select('started_at, distance_km')
    .gte('started_at', from.toISOString().slice(0, 10))
    .order('started_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function loadSessionsForCharts() {
  // Last 84 days (12 weeks) for analytics charts
  const from = new Date();
  from.setDate(from.getDate() - 84);
  const { data, error } = await supabase
    .from('running_sessions')
    .select('started_at, distance_km, duration_sec, pace_sec_per_km, run_type, effort')
    .gte('started_at', from.toISOString().slice(0, 10))
    .order('started_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ── Shoes ──────────────────────────────────────────────────────────────────

export async function loadShoes() {
  const { data, error } = await supabase
    .from('running_shoes')
    .select('*')
    .order('retired', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addShoe(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('running_shoes')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateShoe(id, fields) {
  const { data, error } = await supabase
    .from('running_shoes')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShoe(id) {
  const { error } = await supabase
    .from('running_shoes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function incrementShoeMileage(shoe_id, distance_km) {
  if (!shoe_id || !distance_km) return;
  const { data: shoe } = await supabase
    .from('running_shoes')
    .select('total_km')
    .eq('id', shoe_id)
    .single();
  if (!shoe) return;
  await supabase
    .from('running_shoes')
    .update({ total_km: (shoe.total_km || 0) + distance_km })
    .eq('id', shoe_id);
}

// ── Routes ─────────────────────────────────────────────────────────────────

export async function loadRoutes() {
  const { data, error } = await supabase
    .from('running_routes')
    .select('*')
    .order('times_run', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addRoute(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('running_routes')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoute(id, fields) {
  const { data, error } = await supabase
    .from('running_routes')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoute(id) {
  const { error } = await supabase
    .from('running_routes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function incrementRouteTimesRun(route_id) {
  if (!route_id) return;
  const { data: route } = await supabase
    .from('running_routes')
    .select('times_run')
    .eq('id', route_id)
    .single();
  if (!route) return;
  await supabase
    .from('running_routes')
    .update({ times_run: (route.times_run || 0) + 1 })
    .eq('id', route_id);
}

// ── Personal records ───────────────────────────────────────────────────────

// Standard distances: label → km
export const PR_DISTANCES = [
  { label: '1K',           km: 1.0 },
  { label: '1mile',        km: 1.60934 },
  { label: '5K',           km: 5.0 },
  { label: '10K',          km: 10.0 },
  { label: 'HalfMarathon', km: 21.0975 },
  { label: 'Marathon',     km: 42.195 },
];

export async function loadPRs() {
  const { data, error } = await supabase
    .from('personal_records_running')
    .select('*, running_sessions(id, started_at)')
    .order('distance_label');
  if (error) throw error;
  return data || [];
}

// Check if session sets a new PR for any standard distance (±2%)
// Returns array of { label, time_sec } for any new PRs set
export async function checkAndUpdatePRs(session) {
  const { id: session_id, distance_km, duration_sec, started_at } = session;
  if (!distance_km || !duration_sec) return [];

  const existingPRs = await loadPRs();
  const prMap = Object.fromEntries(existingPRs.map(p => [p.distance_label, p]));

  const newPRs = [];

  for (const { label, km } of PR_DISTANCES) {
    if (distance_km < km * 0.98) continue; // run too short

    // Estimate time at this standard distance using linear interpolation
    // (conservative: pace is assumed constant)
    const estimated_sec = Math.round((km / distance_km) * duration_sec);

    const existing = prMap[label];
    if (!existing || estimated_sec < existing.time_sec) {
      // New PR — upsert
      const user_id = await getUserId();
      await supabase
        .from('personal_records_running')
        .upsert({
          user_id,
          distance_label: label,
          time_sec: estimated_sec,
          session_id,
          set_at: started_at,
        }, { onConflict: 'user_id,distance_label' });

      newPRs.push({ label, time_sec: estimated_sec });
    }
  }

  return newPRs;
}

// ── Race goals ─────────────────────────────────────────────────────────────

export async function loadRaces() {
  const { data, error } = await supabase
    .from('race_goals')
    .select('*')
    .order('race_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addRace(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('race_goals')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRace(id, fields) {
  const { data, error } = await supabase
    .from('race_goals')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRace(id) {
  const { error } = await supabase
    .from('race_goals')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Training plans ─────────────────────────────────────────────────────────

export async function loadPlans() {
  const { data, error } = await supabase
    .from('training_plans')
    .select('*, race_goals(id,name,race_date,distance_km)')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPlan(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('training_plans')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlan(id, fields) {
  const { data, error } = await supabase
    .from('training_plans')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlan(id) {
  const { error } = await supabase
    .from('training_plans')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function loadPlannedRuns(plan_id) {
  const { data, error } = await supabase
    .from('planned_runs')
    .select('*, running_sessions(id,started_at,distance_km,duration_sec,pace_sec_per_km)')
    .eq('plan_id', plan_id)
    .order('run_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addPlannedRun(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('planned_runs')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlannedRun(id, fields) {
  const { data, error } = await supabase
    .from('planned_runs')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlannedRun(id) {
  const { error } = await supabase
    .from('planned_runs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Analytics computations ─────────────────────────────────────────────────

export function computeACWR(sessions) {
  // sessions: [{started_at: 'YYYY-MM-DD', distance_km: number}, ...]
  // Returns { acute, chronic, ratio, zone }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const msPerDay = 86400000;
  let acute = 0;
  let chronicSum = 0;
  let chronicWeeks = 0;

  // Group by week bucket (week 0 = this week's 7 days, week 1-3 = prior 3 weeks)
  const weekKm = [0, 0, 0, 0]; // index 0 = last 7 days, 1 = 8-14 days ago, etc.

  for (const s of sessions) {
    const date = new Date(s.started_at);
    date.setHours(0, 0, 0, 0);
    const daysAgo = Math.round((today - date) / msPerDay);
    const weekIdx = Math.floor(daysAgo / 7);
    if (weekIdx >= 0 && weekIdx < 4) {
      weekKm[weekIdx] += parseFloat(s.distance_km) || 0;
    }
  }

  acute = weekKm[0];
  // Only count weeks that have data for chronic (min 2 weeks)
  const populatedWeeks = weekKm.filter((_, i) => i >= 0).length; // always 4 slots
  const chronic = weekKm.reduce((a, b) => a + b, 0) / 4;

  if (chronic < 0.1) return { acute, chronic, ratio: null, zone: 'insufficient' };

  const ratio = Math.round((acute / chronic) * 100) / 100;
  let zone = 'optimal';
  if (ratio < 0.8) zone = 'detraining';
  else if (ratio > 1.5) zone = 'danger';
  else if (ratio > 1.3) zone = 'caution';

  return { acute, chronic, ratio, zone, weekKm };
}

export function computeWeeklyKm(sessions) {
  // Returns last 12 weeks as [{weekLabel, km, weekStart}] oldest first
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeks = [];
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1 - w * 7); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weeks.push({ weekStart, weekEnd, km: 0, label: `W${12 - w}` });
  }

  for (const s of sessions) {
    const date = new Date(s.started_at);
    date.setHours(0, 0, 0, 0);
    for (const w of weeks) {
      if (date >= w.weekStart && date <= w.weekEnd) {
        w.km += parseFloat(s.distance_km) || 0;
        break;
      }
    }
  }

  return weeks.map(w => ({
    label: w.weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    km: Math.round(w.km * 10) / 10,
  }));
}

export function computePaceByWeek(sessions) {
  // Returns last 12 weeks average pace [{label, pace_sec, easyPace, tempoPace}]
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeks = [];
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1 - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weeks.push({ weekStart, weekEnd, paces: [], easyPaces: [], tempoPaces: [] });
  }

  for (const s of sessions) {
    if (!s.pace_sec_per_km) continue;
    const date = new Date(s.started_at);
    date.setHours(0, 0, 0, 0);
    for (const w of weeks) {
      if (date >= w.weekStart && date <= w.weekEnd) {
        w.paces.push(s.pace_sec_per_km);
        if (['easy','long','recovery'].includes(s.run_type)) w.easyPaces.push(s.pace_sec_per_km);
        if (['tempo','threshold','intervals'].includes(s.run_type)) w.tempoPaces.push(s.pace_sec_per_km);
        break;
      }
    }
  }

  const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;

  return weeks.map(w => ({
    label: w.weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    pace_sec: avg(w.paces),
    easyPace: avg(w.easyPaces),
    tempoPace: avg(w.tempoPaces),
  }));
}

export function computeRunTypeDistribution(sessions) {
  // Returns [{type, count, pct}] for last 90 days
  const counts = {};
  for (const s of sessions) {
    counts[s.run_type] = (counts[s.run_type] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a,b)=>a+b,0) || 1;
  return Object.entries(counts).map(([type, count]) => ({
    type, count, pct: Math.round(count / total * 100),
  })).sort((a,b) => b.count - a.count);
}

// Riegel race time predictor: T2 = T1 × (D2/D1)^1.06
export function riegelPredict(d1_km, t1_sec, d2_km) {
  return Math.round(t1_sec * Math.pow(d2_km / d1_km, 1.06));
}

// Jack Daniels VDOT approximation from a race/time trial
export function computeVDOT(distance_km, time_sec) {
  const d_m = distance_km * 1000;
  const t_min = time_sec / 60;
  const v = d_m / t_min; // m/min
  const pct_vo2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * t_min) +
                     0.2989558 * Math.exp(-0.1932605 * t_min);
  const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
  const vdot = Math.round(vo2 / pct_vo2max * 10) / 10;
  return vdot > 0 ? vdot : null;
}

// VDOT training zone paces (sec/km) from VDOT value
// Based on Daniels' Running Formula equivalences
export function vdotToZonePaces(vdot) {
  if (!vdot) return null;
  // Approximate easy: 65-79% VO2max, threshold: 83-88%, interval: 95-100%
  const easy_sec    = Math.round((-16.4 + 5860 / vdot));
  const marathon_sec= Math.round((-15.4 + 5030 / vdot));
  const threshold_sec = Math.round((-13.6 + 4050 / vdot));
  const interval_sec  = Math.round((-11.8 + 3330 / vdot));
  const rep_sec       = Math.round((-10.1 + 2860 / vdot));
  return { easy: easy_sec, marathon: marathon_sec, threshold: threshold_sec, interval: interval_sec, rep: rep_sec };
}

// ── Realtime ───────────────────────────────────────────────────────────────

export function subscribeRunning(callback) {
  return supabase
    .channel('running-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'running_sessions' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'running_shoes' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'running_routes' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'race_goals' }, callback)
    .subscribe();
}
