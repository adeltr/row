import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// Find or create a row in `exercises` by name (for program exercises that
// may not have a freestyle entry yet). Returns the exercise id.
async function findOrCreateExerciseId(name) {
  const user_id = await getUserId();
  const { data: existing } = await supabase
    .from('exercises')
    .select('id')
    .eq('user_id', user_id)
    .ilike('name', name)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: next } = await supabase
    .from('exercises')
    .select('position')
    .eq('user_id', user_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = next ? next.position + 1 : 0;

  const { data: created, error } = await supabase
    .from('exercises')
    .insert({ user_id, name, position })
    .select('id')
    .single();
  if (error) throw error;
  return created.id;
}

// ── Start / finish workout ────────────────────────────────────

export async function startWorkout(programId, sessionId, sessionName) {
  const user_id = await getUserId();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('workout_logs')
    .insert({
      user_id,
      date: today,
      program_id: programId || null,
      session_id: sessionId || null,
      session_name: sessionName || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function finishWorkout(workoutLogId, { durationMin, totalVolumeKg, feeling, notes } = {}) {
  const { data, error } = await supabase
    .from('workout_logs')
    .update({
      duration_min: durationMin ?? null,
      total_volume_kg: totalVolumeKg ?? null,
      feeling: feeling || null,
      notes: notes || null,
    })
    .eq('id', workoutLogId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkout(workoutLogId) {
  const { error } = await supabase.from('workout_logs').delete().eq('id', workoutLogId);
  if (error) throw error;
}

// ── Log a set ────────────────────────────────────────────────
// Appends one set object to exercise_logs.sets (jsonb array).
// Upserts the exercise_logs row by (user_id, exercise_id, date).

export async function logExerciseSet(workoutLogId, programExerciseId, exerciseName, setNumber, weightKg, reps, rir, notes) {
  const user_id = await getUserId();
  const today = new Date().toISOString().slice(0, 10);
  const exercise_id = await findOrCreateExerciseId(exerciseName);

  const newSet = {
    set_num: setNumber,
    weight_kg: weightKg,
    reps,
    rir: rir ?? null,
    notes: notes || null,
    completed: true,
    timestamp: new Date().toISOString(),
  };

  // load existing sets for today
  const { data: existing } = await supabase
    .from('exercise_logs')
    .select('id, sets')
    .eq('user_id', user_id)
    .eq('exercise_id', exercise_id)
    .eq('date', today)
    .maybeSingle();

  let sets = existing?.sets || [];
  // replace if same set_num already logged, otherwise append
  const idx = sets.findIndex(s => s.set_num === setNumber);
  if (idx >= 0) sets[idx] = newSet;
  else sets.push(newSet);

  const { error } = await supabase
    .from('exercise_logs')
    .upsert(
      {
        user_id,
        exercise_id,
        date: today,
        sets,
        workout_log_id: workoutLogId || null,
        program_exercise_id: programExerciseId || null,
      },
      { onConflict: 'user_id,exercise_id,date' }
    );
  if (error) throw error;
}

// ── Previous performance ──────────────────────────────────────
// Returns the sets array from the most recent exercise_log for this name.

export async function getPreviousPerformance(exerciseName) {
  const user_id = await getUserId();

  // find matching exercise
  const { data: ex } = await supabase
    .from('exercises')
    .select('id')
    .eq('user_id', user_id)
    .ilike('name', exerciseName)
    .limit(1)
    .maybeSingle();
  if (!ex) return null;

  const { data: log } = await supabase
    .from('exercise_logs')
    .select('date, sets')
    .eq('exercise_id', ex.id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return log || null;
}

// ── History ───────────────────────────────────────────────────

export async function loadWorkoutHistory(limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('id,date,session_name,program_id,session_id,duration_min,total_volume_kg,feeling,created_at')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}

export async function loadWorkoutDetail(workoutLogId) {
  const [logRes, logsRes] = await Promise.all([
    supabase.from('workout_logs').select('*').eq('id', workoutLogId).single(),
    supabase.from('exercise_logs').select('exercise_id,date,sets,program_exercise_id').eq('workout_log_id', workoutLogId),
  ]);
  if (logRes.error) throw logRes.error;

  // resolve exercise names
  const exerciseLogs = logsRes.data || [];
  const exerciseIds = [...new Set(exerciseLogs.map(l => l.exercise_id))];
  let nameMap = {};
  if (exerciseIds.length) {
    const { data: exs } = await supabase.from('exercises').select('id,name').in('id', exerciseIds);
    (exs || []).forEach(e => { nameMap[e.id] = e.name; });
  }

  return {
    workout: logRes.data,
    exercises: exerciseLogs.map(l => ({ ...l, name: nameMap[l.exercise_id] || '?' })),
  };
}

// ── Realtime ─────────────────────────────────────────────────

export function subscribeWorkoutLogs(callback) {
  return supabase
    .channel('workout_logs_rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_logs' }, callback)
    .subscribe();
}
