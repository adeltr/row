import { supabase } from './supabase.js';

// ── Gym profile ────────────────────────────────────────────────

export async function loadGymProfile() {
  const { data } = await supabase.from('gym_profile').select('*').maybeSingle();
  return data;
}

export async function saveGymProfile(fields) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('gym_profile')
    .upsert({ user_id: user.id, ...fields }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ── Exercises ──────────────────────────────────────────────────

export async function loadExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('position');
  if (error) throw error;
  return data;
}

export async function addExercise(fields) {
  const { data, error } = await supabase
    .from('exercises')
    .insert(fields)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExercise(id, fields) {
  const { data, error } = await supabase
    .from('exercises')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExercise(id) {
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function seedExercises(exerciseList) {
  const { data: { user } } = await supabase.auth.getUser();
  const rows = exerciseList.map((e, i) => ({ ...e, user_id: user.id, position: i }));
  const { data, error } = await supabase.from('exercises').insert(rows).select();
  if (error) throw error;
  return data;
}

// ── Exercise logs ──────────────────────────────────────────────

export async function loadExerciseLogs(exerciseId) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('date, sets')
    .eq('exercise_id', exerciseId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function loadAllLogs() {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('exercise_id, date, sets')
    .order('date', { ascending: false });
  if (error) throw error;
  // Returns {[exerciseId]: [{date, sets}]}
  const out = {};
  (data || []).forEach(r => {
    if (!out[r.exercise_id]) out[r.exercise_id] = [];
    out[r.exercise_id].push({ date: r.date, sets: r.sets });
  });
  return out;
}

export async function logExercise(exerciseId, dateStr, sets) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('exercise_logs')
    .upsert(
      { user_id: user.id, exercise_id: exerciseId, date: dateStr, sets },
      { onConflict: 'user_id,exercise_id,date' }
    );
  if (error) throw error;
}

// ── Workout days ───────────────────────────────────────────────

export async function loadWorkoutDays() {
  const { data, error } = await supabase
    .from('workout_days')
    .select('*')
    .order('position');
  if (error) throw error;
  return data;
}

export async function seedWorkoutDays(daysList) {
  const { data: { user } } = await supabase.auth.getUser();
  const rows = daysList.map((d, i) => ({ user_id: user.id, name: d.name, position: i }));
  const { data, error } = await supabase.from('workout_days').insert(rows).select();
  if (error) throw error;
  return data;
}

// ── Workout completion ─────────────────────────────────────────

export async function loadDoneDays() {
  const { data, error } = await supabase
    .from('workout_completion')
    .select('date, done');
  if (error) throw error;
  const out = {};
  (data || []).forEach(r => { out[r.date] = r.done; });
  return out;
}

export async function setWorkoutDone(dateStr, done) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('workout_completion')
    .upsert(
      { user_id: user.id, date: dateStr, done },
      { onConflict: 'user_id,date' }
    );
  if (error) throw error;
}

// ── Body weight ────────────────────────────────────────────────

export async function loadWeights() {
  const { data, error } = await supabase
    .from('body_weight_logs')
    .select('date, weight, unit')
    .order('date');
  if (error) throw error;
  return data;
}

export async function logWeight(dateStr, weight, unit) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('body_weight_logs')
    .upsert(
      { user_id: user.id, date: dateStr, weight, unit },
      { onConflict: 'user_id,date' }
    );
  if (error) throw error;
}

// ── Split rotation ─────────────────────────────────────────────

export async function loadSplitRotation() {
  const { data } = await supabase.from('split_rotation').select('*').maybeSingle();
  return data;
}

export async function saveSplitRotation(rotation, anchor) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('split_rotation')
    .upsert(
      { user_id: user.id, rotation, anchor: anchor || null },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

// ── Photos ─────────────────────────────────────────────────────

export async function loadPhotos() {
  const { data, error } = await supabase
    .from('gym_photos')
    .select('id, date, storage_path, created_at')
    .order('date', { ascending: false });
  if (error) throw error;

  return Promise.all((data || []).map(async row => {
    const { data: urlData } = await supabase.storage
      .from('gym-photos')
      .createSignedUrl(row.storage_path, 3600);
    return { ...row, signedUrl: urlData?.signedUrl ?? null };
  }));
}

export async function uploadPhoto(dateStr, file) {
  const { data: { user } } = await supabase.auth.getUser();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('gym-photos')
    .upload(path, file, { contentType: file.type });
  if (upErr) throw upErr;

  const { error: dbErr } = await supabase
    .from('gym_photos')
    .insert({ user_id: user.id, date: dateStr, storage_path: path });
  if (dbErr) throw dbErr;

  const { data: urlData } = await supabase.storage
    .from('gym-photos')
    .createSignedUrl(path, 3600);
  return { path, signedUrl: urlData?.signedUrl ?? null };
}

export async function deletePhoto(id, storagePath) {
  await supabase.storage.from('gym-photos').remove([storagePath]);
  const { error } = await supabase.from('gym_photos').delete().eq('id', id);
  if (error) throw error;
}

// ── Realtime ────────────────────────────────────────────────────

export function subscribeExerciseLogs(callback) {
  return supabase
    .channel('exercise_logs_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'exercise_logs' }, callback)
    .subscribe();
}
