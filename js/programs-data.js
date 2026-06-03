import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Browse ────────────────────────────────────────────────────

export async function loadPublicPrograms({ goal, level, tags, sortBy } = {}) {
  let q = supabase
    .from('programs')
    .select('id,name,description,duration_weeks,goal,level,is_official,copy_count,rating_avg,rating_count,cover_image_url,tags')
    .or('is_public.eq.true,is_official.eq.true');

  if (goal)  q = q.eq('goal', goal);
  if (level) q = q.eq('level', level);
  if (tags && tags.length) q = q.contains('tags', JSON.stringify(tags));

  if (sortBy === 'rating')  q = q.order('rating_avg', { ascending: false });
  else if (sortBy === 'newest') q = q.order('created_at', { ascending: false });
  else q = q.order('copy_count', { ascending: false });

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function loadOfficialPrograms() {
  const { data, error } = await supabase
    .from('programs')
    .select('id,name,description,duration_weeks,goal,level,copy_count,rating_avg,rating_count,cover_image_url,tags')
    .eq('is_official', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function loadMyPrograms() {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('programs')
    .select('id,name,description,duration_weeks,goal,level,is_public,copy_count,rating_avg,rating_count,cover_image_url,tags,created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Full program load (program + sessions + exercises + schedule) ──

export async function loadProgramFull(programId) {
  const [progRes, sessRes, schedRes] = await Promise.all([
    supabase.from('programs').select('*').eq('id', programId).single(),
    supabase.from('program_sessions').select('*').eq('program_id', programId).order('order_index'),
    supabase.from('program_schedules').select('*').eq('program_id', programId).order('day_of_week'),
  ]);
  if (progRes.error) throw progRes.error;
  if (sessRes.error) throw sessRes.error;
  if (schedRes.error) throw schedRes.error;

  const sessions = sessRes.data || [];
  const sessionIds = sessions.map(s => s.id);

  let exercises = [];
  if (sessionIds.length) {
    const { data, error } = await supabase
      .from('program_exercises')
      .select('*')
      .in('session_id', sessionIds)
      .order('order_index');
    if (error) throw error;
    exercises = data || [];
  }

  // group exercises by session_id
  const exBySession = {};
  exercises.forEach(ex => {
    if (!exBySession[ex.session_id]) exBySession[ex.session_id] = [];
    exBySession[ex.session_id].push(ex);
  });

  return {
    program: progRes.data,
    sessions: sessions.map(s => ({ ...s, exercises: exBySession[s.id] || [] })),
    schedule: schedRes.data || [],
  };
}

// ── Copy program ──────────────────────────────────────────────

export async function copyProgramToMine(programId) {
  const user_id = await getUserId();
  const { program, sessions, schedule } = await loadProgramFull(programId);

  // create new program
  const { data: newProg, error: pe } = await supabase
    .from('programs')
    .insert({
      user_id,
      name: `${program.name} (copy)`,
      description: program.description,
      duration_weeks: program.duration_weeks,
      goal: program.goal,
      level: program.level,
      is_public: false,
      is_official: false,
      tags: program.tags,
      cover_image_url: program.cover_image_url,
    })
    .select()
    .single();
  if (pe) throw pe;

  // session old → new id map
  const sessionMap = {};
  for (const s of sessions) {
    const { data: ns, error: se } = await supabase
      .from('program_sessions')
      .insert({
        program_id: newProg.id,
        name: s.name,
        order_index: s.order_index,
        warmup_note: s.warmup_note,
        rest_between_exercises_sec: s.rest_between_exercises_sec,
        notes: s.notes,
      })
      .select()
      .single();
    if (se) throw se;
    sessionMap[s.id] = ns.id;
  }

  // exercise old → new id map (for superset re-linking)
  const exerciseMap = {};
  const allExercises = sessions.flatMap(s => s.exercises || []);

  for (const ex of allExercises) {
    const { data: ne, error: ee } = await supabase
      .from('program_exercises')
      .insert({
        session_id: sessionMap[ex.session_id],
        name: ex.name,
        order_index: ex.order_index,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        rest_sec: ex.rest_sec,
        technique: ex.technique,
        notes: ex.notes,
        is_superset: ex.is_superset,
        video_url: ex.video_url,
      })
      .select()
      .single();
    if (ee) throw ee;
    exerciseMap[ex.id] = ne.id;
  }

  // re-link superset pairs
  for (const ex of allExercises) {
    if (ex.is_superset && ex.superset_with_id && exerciseMap[ex.superset_with_id]) {
      await supabase
        .from('program_exercises')
        .update({ superset_with_id: exerciseMap[ex.superset_with_id] })
        .eq('id', exerciseMap[ex.id]);
    }
  }

  // copy schedule using new session ids
  for (const sch of schedule) {
    await supabase.from('program_schedules').insert({
      program_id: newProg.id,
      day_of_week: sch.day_of_week,
      session_id: sch.session_id ? sessionMap[sch.session_id] : null,
      rest_label: sch.rest_label,
    });
  }

  // bump copy_count on original
  await supabase.rpc('increment_copy_count', { program_id: programId }).catch(() => {
    supabase.from('programs').update({ copy_count: program.copy_count + 1 }).eq('id', programId);
  });

  return newProg;
}

// ── Create / update / delete program ─────────────────────────

export async function createProgram(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('programs')
    .insert({ user_id, is_official: false, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProgram(id, fields) {
  const { data, error } = await supabase
    .from('programs')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProgram(id) {
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) throw error;
}

// ── Sessions ──────────────────────────────────────────────────

export async function addSession(programId, fields) {
  const { data: existing } = await supabase
    .from('program_sessions')
    .select('order_index')
    .eq('program_id', programId)
    .order('order_index', { ascending: false })
    .limit(1);
  const nextIndex = existing && existing.length ? existing[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from('program_sessions')
    .insert({ program_id: programId, order_index: nextIndex, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSession(id, fields) {
  const { data, error } = await supabase
    .from('program_sessions')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(id) {
  const { error } = await supabase.from('program_sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderSessions(programId, orderedIds) {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('program_sessions').update({ order_index: i }).eq('id', id)
    )
  );
}

// ── Exercises ─────────────────────────────────────────────────

export async function addExercise(sessionId, fields) {
  const { data: existing } = await supabase
    .from('program_exercises')
    .select('order_index')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: false })
    .limit(1);
  const nextIndex = existing && existing.length ? existing[0].order_index + 1 : 0;

  const { data, error } = await supabase
    .from('program_exercises')
    .insert({ session_id: sessionId, order_index: nextIndex, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExercise(id, fields) {
  const { data, error } = await supabase
    .from('program_exercises')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExercise(id) {
  const { error } = await supabase.from('program_exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderExercises(sessionId, orderedIds) {
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from('program_exercises').update({ order_index: i }).eq('id', id)
    )
  );
}

export async function linkSuperset(exerciseId1, exerciseId2) {
  await Promise.all([
    supabase.from('program_exercises').update({ is_superset: true, superset_with_id: exerciseId2 }).eq('id', exerciseId1),
    supabase.from('program_exercises').update({ is_superset: true, superset_with_id: exerciseId1 }).eq('id', exerciseId2),
  ]);
}

export async function unlinkSuperset(exerciseId1, exerciseId2) {
  await Promise.all([
    supabase.from('program_exercises').update({ is_superset: false, superset_with_id: null }).eq('id', exerciseId1),
    supabase.from('program_exercises').update({ is_superset: false, superset_with_id: null }).eq('id', exerciseId2),
  ]);
}

// ── Schedule ──────────────────────────────────────────────────

export async function setSchedule(programId, dayOfWeek, sessionId, restLabel) {
  const { error } = await supabase
    .from('program_schedules')
    .upsert(
      { program_id: programId, day_of_week: dayOfWeek, session_id: sessionId || null, rest_label: restLabel || null },
      { onConflict: 'program_id,day_of_week' }
    );
  if (error) throw error;
}

// ── Active program ────────────────────────────────────────────

export async function setActiveProgram(programId) {
  const user_id = await getUserId();
  const { error } = await supabase
    .from('user_active_programs')
    .upsert(
      { user_id, program_id: programId, started_at: new Date().toISOString().slice(0, 10), current_week: 1 },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

export async function clearActiveProgram() {
  const user_id = await getUserId();
  const { error } = await supabase
    .from('user_active_programs')
    .upsert(
      { user_id, program_id: null },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

export async function getActiveProgram() {
  const { data: active, error } = await supabase
    .from('user_active_programs')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!active || !active.program_id) return null;

  const full = await loadProgramFull(active.program_id);

  // JS getDay(): 0=Sun … 6=Sat → convert to DB: 0=Mon … 6=Sun
  const jsDay = new Date().getDay();
  const dbDay = (jsDay + 6) % 7;
  const todaySchedule = full.schedule.find(s => s.day_of_week === dbDay) || null;

  let todaySession = null;
  if (todaySchedule && todaySchedule.session_id) {
    todaySession = full.sessions.find(s => s.id === todaySchedule.session_id) || null;
  }

  return { ...full, activeRecord: active, todaySchedule, todaySession };
}

// ── Ratings ───────────────────────────────────────────────────

export async function rateProgram(programId, rating, comment) {
  const user_id = await getUserId();
  const { error } = await supabase
    .from('program_ratings')
    .upsert(
      { user_id, program_id: programId, rating, comment: comment || null },
      { onConflict: 'user_id,program_id' }
    );
  if (error) throw error;
}

export async function loadRatings(programId) {
  const { data, error } = await supabase
    .from('program_ratings')
    .select('rating,comment,created_at')
    .eq('program_id', programId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
