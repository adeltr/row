import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Books ──────────────────────────────────────────────────────────────────

export async function loadBooks({ status, category, sortBy = 'priority', limit = 50, offset = 0 } = {}) {
  const user_id = await getUserId();
  let q = supabase
    .from('books')
    .select('*')
    .eq('user_id', user_id);
  if (status) q = q.eq('status', status);
  if (category) q = q.eq('category', category);
  if (sortBy === 'priority')   q = q.order('priority', { ascending: false }).order('created_at', { ascending: false });
  else if (sortBy === 'title') q = q.order('title');
  else if (sortBy === 'pages') q = q.order('pages', { ascending: false, nullsFirst: false });
  else if (sortBy === 'date')  q = q.order('created_at', { ascending: false });
  else                         q = q.order('created_at', { ascending: false });
  q = q.range(offset, offset + limit - 1);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function addBook(fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('books')
    .insert({ user_id, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBook(id, fields) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('books')
    .update({ ...fields, updated_at: now })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBook(id) {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function updateReadingProgress(bookId, currentPage) {
  return updateBook(bookId, { current_page: currentPage });
}

export async function loadBookDetail(bookId) {
  const { data: book, error: bErr } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();
  if (bErr) throw bErr;
  const { data: notes, error: nErr } = await supabase
    .from('book_notes')
    .select('*')
    .eq('book_id', bookId)
    .order('created_at');
  if (nErr) throw nErr;
  return { ...book, notes: notes || [] };
}

export async function searchBooks(query) {
  const user_id = await getUserId();
  const q = query.toLowerCase();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user_id)
    .or(`title.ilike.%${q}%,author.ilike.%${q}%`)
    .order('title')
    .limit(30);
  if (error) throw error;
  return data || [];
}

export async function linkBookToObjective(bookId, objectiveId, yearlyId) {
  return updateBook(bookId, {
    linked_objective_id: objectiveId || null,
    linked_yearly_id:    yearlyId    || null,
  });
}

export async function loadBooksForObjective(objectiveId, which) {
  const user_id = await getUserId();
  const col = which === 'year' ? 'linked_yearly_id' : 'linked_objective_id';
  const { data } = await supabase
    .from('books')
    .select('id, title, status')
    .eq('user_id', user_id)
    .eq(col, objectiveId);
  return data || [];
}

// ── Book stats ─────────────────────────────────────────────────────────────

export async function loadBookStats() {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('books')
    .select('status, pages, finished_at, rating, category')
    .eq('user_id', user_id);
  if (error) throw error;
  const books = data || [];
  const thisYear = new Date().getFullYear();
  const completed = books.filter(b => b.status === 'completed');
  const completedThisYear = completed.filter(b => b.finished_at && new Date(b.finished_at).getFullYear() === thisYear);
  const totalPages = completed.reduce((s, b) => s + (b.pages || 0), 0);
  const ratings = completed.filter(b => b.rating).map(b => b.rating);
  const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : null;
  const catCounts = {};
  for (const b of completed) { if (b.category) catCounts[b.category] = (catCounts[b.category] || 0) + 1; }
  const favCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return {
    total: books.length,
    queue: books.filter(b => b.status === 'queue').length,
    reading: books.filter(b => b.status === 'reading').length,
    completed: completed.length,
    completedThisYear: completedThisYear.length,
    totalPages,
    avgRating,
    favCategory,
  };
}

export async function loadCompletedByMonth() {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('books')
    .select('finished_at')
    .eq('user_id', user_id)
    .eq('status', 'completed')
    .not('finished_at', 'is', null);
  if (error) throw error;
  const counts = {};
  for (const b of data || []) {
    const d = new Date(b.finished_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

// ── Book notes ─────────────────────────────────────────────────────────────

export async function addBookNote(bookId, fields) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('book_notes')
    .insert({ user_id, book_id: bookId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBookNote(id, fields) {
  const { data, error } = await supabase
    .from('book_notes')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBookNote(id) {
  const { error } = await supabase
    .from('book_notes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Realtime ───────────────────────────────────────────────────────────────

export function subscribeBooks(callback) {
  return supabase
    .channel('library-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'book_notes' }, callback)
    .subscribe();
}
