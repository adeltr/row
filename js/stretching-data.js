import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Routines ──────────────────────────────────────────────────────

export async function loadRoutines() {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('stretch_routines')
    .select('id,name,description,created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function loadRoutineWithStretches(routineId) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('stretch_routines')
    .select('id,name,description,created_at,stretches(id,name,description,duration_sec,photo_url,order_index,created_at)')
    .eq('id', routineId)
    .eq('user_id', user_id)
    .order('order_index', { referencedTable: 'stretches', ascending: true })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addRoutine({ name, description = '' }) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('stretch_routines')
    .insert({ user_id, name, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoutine(routineId, fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('stretch_routines')
    .update(fields)
    .eq('id', routineId)
    .eq('user_id', user_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoutine(routineId) {
  const user_id = await getUserId();
  const { error } = await supabase
    .from('stretch_routines')
    .delete()
    .eq('id', routineId)
    .eq('user_id', user_id);
  if (error) throw error;
}

// ── Stretches ─────────────────────────────────────────────────────

export async function addStretch(routineId, { name, description = '', duration_sec = 30, photo_url = null }) {
  // Determine next order_index
  const { data: last } = await supabase
    .from('stretches')
    .select('order_index')
    .eq('routine_id', routineId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_index = last ? last.order_index + 1 : 0;

  const { data, error } = await supabase
    .from('stretches')
    .insert({ routine_id: routineId, name, description, duration_sec, photo_url, order_index })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStretch(stretchId, fields) {
  const { data, error } = await supabase
    .from('stretches')
    .update(fields)
    .eq('id', stretchId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStretch(stretchId) {
  const { error } = await supabase
    .from('stretches')
    .delete()
    .eq('id', stretchId);
  if (error) throw error;
}

// Reorder stretches within a routine by providing the desired ordered array of IDs.
export async function reorderStretches(routineId, orderedIds) {
  const updates = orderedIds.map((id, i) =>
    supabase.from('stretches').update({ order_index: i }).eq('id', id).eq('routine_id', routineId)
  );
  const results = await Promise.all(updates);
  const failed = results.find(r => r.error);
  if (failed) throw failed.error;
}

// ── Photos ────────────────────────────────────────────────────────

// Compress an image File to max 1080px wide, returns a Blob.
async function compressImage(file, maxWidth = 1080) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function uploadStretchPhoto(stretchId, file) {
  const user_id = await getUserId();
  const blob = await compressImage(file);
  const ext  = 'jpg';
  const path = `${user_id}/${stretchId}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('stretch-photos')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (upErr) throw upErr;

  const { data: { publicUrl } } = supabase.storage
    .from('stretch-photos')
    .getPublicUrl(path);

  // For private buckets we use a signed URL approach; store the storage path instead.
  // photo_url stores the storage path; UI generates signed URLs on demand.
  const { data, error } = await supabase
    .from('stretches')
    .update({ photo_url: path })
    .eq('id', stretchId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Returns a 1-hour signed URL for displaying a stretch photo.
export async function getStretchPhotoUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from('stretch-photos')
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteStretchPhoto(stretchId) {
  // Get current path
  const { data: row, error: fetchErr } = await supabase
    .from('stretches')
    .select('photo_url')
    .eq('id', stretchId)
    .single();
  if (fetchErr) throw fetchErr;

  if (row?.photo_url) {
    await supabase.storage.from('stretch-photos').remove([row.photo_url]);
  }

  const { error } = await supabase
    .from('stretches')
    .update({ photo_url: null })
    .eq('id', stretchId);
  if (error) throw error;
}

// ── Stretching logs ───────────────────────────────────────────────

export async function loadStretchingLogs(startDate, endDate) {
  const user_id = await getUserId();
  let q = supabase
    .from('stretching_logs')
    .select('id,routine_id,date,duration_min,notes,created_at,stretch_routines(name)')
    .eq('user_id', user_id)
    .order('date', { ascending: false });
  if (startDate) q = q.gte('date', startDate);
  if (endDate)   q = q.lte('date', endDate);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function addStretchingLog({ routine_id = null, date, duration_min = null, notes = '' }) {
  const user_id = await getUserId();
  const logDate = date || new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('stretching_logs')
    .insert({ user_id, routine_id, date: logDate, duration_min, notes })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStretchingLog(logId) {
  const user_id = await getUserId();
  const { error } = await supabase
    .from('stretching_logs')
    .delete()
    .eq('id', logId)
    .eq('user_id', user_id);
  if (error) throw error;
}

// ── Streak ────────────────────────────────────────────────────────

// Given an array of log objects (each with a `date` string YYYY-MM-DD),
// returns the current consecutive-day streak ending today or yesterday.
export function computeCurrentStreak(logs) {
  if (!logs || !logs.length) return 0;

  // Collect unique dates, sorted descending
  const dates = [...new Set(logs.map(l => l.date))].sort((a, b) => b.localeCompare(a));

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

  // Streak must include today or yesterday to be "active"
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = Math.round((prev - curr) / 864e5);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── Realtime ──────────────────────────────────────────────────────

export function subscribeStretching(callback) {
  const channel = supabase
    .channel('stretching-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stretch_routines' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stretches' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stretching_logs' }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
