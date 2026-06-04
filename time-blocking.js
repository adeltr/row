// time-blocking.js — Structured-inspired time blocking for the Goals dashboard
// Uses window.__supabase (set by supabase.js module) for all persistence.
(function () {
  'use strict';

  var START_HOUR  = 6;
  var END_HOUR    = 24;   // midnight
  var PX_PER_MIN  = 1.2;  // 72 px / hour
  var SNAP_GRID   = 5;    // minutes — drag snap
  var CREATE_SNAP = 15;   // minutes — click-to-create snap
  var MIN_DUR     = 15;   // minimum block duration (minutes)
  var GUTTER_W    = 48;   // px — left gutter for hour labels
  var TOTAL_MINS  = (END_HOUR - START_HOUR) * 60;

  var CATEGORIES = [
    { name: 'Deep Work', color: '#4A9EFF' },
    { name: 'Workout',   color: '#6BE3A4' },
    { name: 'Meals',     color: '#F2C063' },
    { name: 'Break',     color: '#76746E' },
    { name: 'Study',     color: '#A78BFA' },
    { name: 'Social',    color: '#FB923C' },
    { name: 'Other',     color: '#B8B6B0' },
  ];

  // ── date helpers ──────────────────────────────────────────────────────────

  function pad2(n) { return String(n).padStart(2, '0'); }

  function getTodayStr() {
    var now = new Date();
    if (now.getHours() < 6) now.setDate(now.getDate() - 1);
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  }

  function formatDateLabel(s) {
    var parts = s.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    var days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + parts[2];
  }

  function localDayBounds(dateStr) {
    var p = dateStr.split('-').map(Number);
    return {
      start: new Date(p[0], p[1]-1, p[2],  0,  0,  0),
      end:   new Date(p[0], p[1]-1, p[2], 23, 59, 59),
    };
  }

  function minsFromTimeline(date) {
    return (date.getHours() - START_HOUR) * 60 + date.getMinutes();
  }

  function timelineToDate(dateStr, totalMins) {
    var p = dateStr.split('-').map(Number);
    var abs = START_HOUR * 60 + totalMins;
    return new Date(p[0], p[1]-1, p[2], Math.floor(abs/60), abs%60, 0);
  }

  function snapTo(mins, grid) { return Math.round(mins / grid) * grid; }

  function formatHourLabel(h) {
    if (h === 0 || h === 24) return '12 AM';
    if (h === 12) return '12 PM';
    return (h < 12 ? h : h - 12) + (h < 12 ? ' AM' : ' PM');
  }

  function formatTime(date) {
    var h = date.getHours(), m = date.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return h + ':' + pad2(m) + ' ' + ampm;
  }

  function minsToTimeInput(mins) {
    var abs = START_HOUR * 60 + mins;
    return pad2(Math.floor(abs/60)) + ':' + pad2(abs%60);
  }

  function timeInputToMins(str) {
    var parts = str.split(':').map(Number);
    return (parts[0] - START_HOUR) * 60 + parts[1];
  }

  // ── pixel helpers ──────────────────────────────────────────────────────────

  function minToY(m)  { return m * PX_PER_MIN; }
  function yToMin(y)  { return y / PX_PER_MIN; }

  // ── HTML escaping ──────────────────────────────────────────────────────────

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Store ─────────────────────────────────────────────────────────────────

  var Store = {
    supa:      null,
    userId:    null,
    blocks:    [],          // day-view blocks (for current dateStr)
    weekBlocks: [],         // week-view blocks (for current week)
    dateStr:   '',
    _cbs:      [],

    init: function (dateStr) {
      var self = this;
      this.dateStr = dateStr;
      this._loadLocal();

      function tryConnect() {
        if (window.__supabase) {
          self.supa = window.__supabase;
          self.supa.auth.getUser().then(function(res) {
            self.userId = res.data && res.data.user ? res.data.user.id : null;
            self.fetch();
            self._subscribe();
          }).catch(function() { self.fetch(); });
        } else {
          setTimeout(tryConnect, 300);
        }
      }
      tryConnect();
    },

    on: function (fn) { this._cbs.push(fn); },

    _emit: function () {
      var blocks = this.blocks;
      this._cbs.forEach(function(fn) { try { fn(blocks); } catch(e) {} });
    },
    _emitWeek: function () {
      var blocks = this.weekBlocks;
      this._weekCbs.forEach(function(fn) { try { fn(blocks); } catch(e) {} });
    },
    _weekCbs: [],
    onWeek: function(fn) { this._weekCbs.push(fn); },

    _saveLocal: function () {
      try { localStorage.setItem('tb:' + this.dateStr, JSON.stringify(this.blocks)); } catch(e) {}
    },

    _loadLocal: function () {
      try {
        var d = JSON.parse(localStorage.getItem('tb:' + this.dateStr));
        if (Array.isArray(d)) this.blocks = d;
      } catch(e) {}
    },

    fetch: async function () {
      if (!this.supa) { this._emit(); return; }
      var b = localDayBounds(this.dateStr);
      var res = await this.supa
        .from('time_blocks').select('*')
        .gte('start_time', b.start.toISOString())
        .lte('start_time', b.end.toISOString())
        .order('start_time');
      if (!res.error && res.data) {
        this.blocks = res.data;
        this._saveLocal();
      }
      this._emit();
    },

    fetchWeek: async function (mondayStr) {
      if (!this.supa) { this._emitWeek(); return; }
      var parts = mondayStr.split('-').map(Number);
      var monday = new Date(parts[0], parts[1]-1, parts[2], 0, 0, 0);
      var sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59);
      var res = await this.supa
        .from('time_blocks').select('*')
        .gte('start_time', monday.toISOString())
        .lte('start_time', sunday.toISOString())
        .order('start_time');
      if (!res.error && res.data) {
        this.weekBlocks = res.data;
      }
      this._emitWeek();
    },

    _subscribe: function () {
      if (!this.supa) return;
      var self = this;
      this.supa.channel('tb_global')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'time_blocks' },
          function () {
            if (_currentView === 'week') self.fetchWeek(_currentWeekMonday);
            else self.fetch();
          })
        .subscribe();
    },

    createBlock: async function (fields) {
      if (this.supa) {
        if (!this.userId) { console.warn('[time-blocking] Cannot insert: user not authenticated yet'); return Promise.reject(new Error('User not authenticated')); }
        var insert = Object.assign({ user_id: this.userId }, fields);
        var res = await this.supa.from('time_blocks').insert(insert).select().single();
        if (!res.error) {
          if (_currentView === 'week') await this.fetchWeek(_currentWeekMonday);
          else await this.fetch();
          return res.data;
        }
      }
      var block = Object.assign({ id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)), completed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, fields);
      this.blocks.push(block);
      this.blocks.sort(function(a,b){ return new Date(a.start_time) - new Date(b.start_time); });
      this._saveLocal(); this._emit();
      return block;
    },

    updateBlock: async function (id, fields) {
      var patch = Object.assign({}, fields, { updated_at: new Date().toISOString() });
      if (this.supa) {
        await this.supa.from('time_blocks').update(patch).eq('id', id);
        if (_currentView === 'week') await this.fetchWeek(_currentWeekMonday);
        else await this.fetch();
        return;
      }
      var idx = this.blocks.findIndex(function(b){ return b.id === id; });
      if (idx !== -1) {
        this.blocks[idx] = Object.assign({}, this.blocks[idx], patch);
        this.blocks.sort(function(a,b){ return new Date(a.start_time) - new Date(b.start_time); });
        this._saveLocal(); this._emit();
      }
    },

    deleteBlock: async function (id) {
      if (this.supa) {
        await this.supa.from('time_blocks').delete().eq('id', id);
        if (_currentView === 'week') await this.fetchWeek(_currentWeekMonday);
        else await this.fetch();
        return;
      }
      this.blocks = this.blocks.filter(function(b){ return b.id !== id; });
      this._saveLocal(); this._emit();
    },
  };

  // ── Modal ─────────────────────────────────────────────────────────────────

  var _modalEl = null;

  function closeModal() {
    if (_modalEl) { _modalEl.remove(); _modalEl = null; }
    document.body.classList.remove('tb-no-scroll');
  }

  function openModal(block, defaultStartMins, targetDateStr) {
    closeModal();
    var isNew = !block;
    var dateStr = targetDateStr || Store.dateStr;

    var startMins = defaultStartMins != null
      ? snapTo(defaultStartMins, CREATE_SNAP)
      : snapTo(minsFromTimeline(new Date()), CREATE_SNAP);
    startMins = Math.max(0, Math.min(startMins, TOTAL_MINS - 60));
    var endMins   = startMins + 60;
    var title      = '';
    var pickedColor    = CATEGORIES[0].color;
    var pickedCategory = CATEGORIES[0].name;
    var notes      = '';
    var completed  = false;
    var linkedGoal = '';

    if (block) {
      var s = new Date(block.start_time), e = new Date(block.end_time);
      startMins  = minsFromTimeline(s);
      endMins    = minsFromTimeline(e);
      title      = block.title || '';
      pickedColor    = block.color    || CATEGORIES[0].color;
      pickedCategory = block.category || CATEGORIES[0].name;
      notes      = block.notes || '';
      completed  = !!block.completed;
      linkedGoal = block.linked_goal || '';
    }
    endMins = Math.max(startMins + MIN_DUR, Math.min(endMins, TOTAL_MINS));

    var todayGoals = [];
    try {
      var raw = JSON.parse(localStorage.getItem('goals:' + dateStr));
      if (Array.isArray(raw)) todayGoals = raw.map(function(x){ return x.text; }).filter(Boolean);
    } catch(e) {}

    var bg = document.createElement('div');
    bg.className = 'tb-modal-bg';
    bg.innerHTML = '<div class="tb-modal" role="dialog" aria-modal="true">'
      + '<div class="tb-modal-hd"><span class="tb-modal-ttl">' + (isNew ? 'New Block' : 'Edit Block') + '</span>'
      + '<button class="tb-modal-x" aria-label="Close">×</button></div>'
      + '<div class="tb-mf"><label class="tb-ml">Title</label>'
      + '<input class="tb-mi" id="tbMTitle" type="text" placeholder="What are you doing?" autocomplete="off" value="' + esc(title) + '"></div>'
      + '<div class="tb-mf tb-mf-row">'
      + '<div class="tb-mf-half"><label class="tb-ml">Start</label>'
      + '<input class="tb-mi" id="tbMStart" type="time" value="' + minsToTimeInput(startMins) + '"></div>'
      + '<div class="tb-mf-half"><label class="tb-ml">End</label>'
      + '<input class="tb-mi" id="tbMEnd" type="time" value="' + minsToTimeInput(endMins) + '"></div></div>'
      + '<div class="tb-mf"><label class="tb-ml">Category</label><div class="tb-cats" id="tbMCats"></div></div>'
      + '<div class="tb-mf"><label class="tb-ml">Link to goal</label>'
      + '<select class="tb-mi tb-msel" id="tbMGoal"><option value="">— none —</option>'
      + todayGoals.map(function(g){ return '<option value="' + esc(g) + '"' + (g === linkedGoal ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="tb-mf"><label class="tb-ml">Notes</label>'
      + '<textarea class="tb-mi tb-mta" id="tbMNotes" placeholder="Optional notes…">' + esc(notes) + '</textarea></div>'
      + '<div class="tb-mac">'
      + (!isNew ? '<button class="tb-mbtn tb-mbtn-danger" id="tbMDel">Delete</button>' : '')
      + (!isNew ? '<label class="tb-mchk"><input type="checkbox" id="tbMDone"' + (completed ? ' checked' : '') + '> Mark complete</label>' : '')
      + '<button class="tb-mbtn tb-mbtn-sec" id="tbMCancel">Cancel</button>'
      + '<button class="tb-mbtn tb-mbtn-pri" id="tbMSave">Save</button></div>'
      + '</div>';

    document.body.appendChild(bg);
    _modalEl = bg;
    document.body.classList.add('tb-no-scroll');

    // Category picker
    var catsEl = bg.querySelector('#tbMCats');
    CATEGORIES.forEach(function(cat) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tb-cat' + (cat.color === pickedColor ? ' tb-cat-on' : '');
      btn.textContent = cat.name;
      btn.style.setProperty('--cc', cat.color);
      btn.addEventListener('click', function() {
        pickedColor = cat.color;
        pickedCategory = cat.name;
        catsEl.querySelectorAll('.tb-cat').forEach(function(b){ b.classList.remove('tb-cat-on'); });
        btn.classList.add('tb-cat-on');
      });
      catsEl.appendChild(btn);
    });

    var titleInput = bg.querySelector('#tbMTitle');
    setTimeout(function(){ titleInput.focus(); titleInput.select(); }, 60);

    bg.querySelector('.tb-modal-x').addEventListener('click', closeModal);
    bg.querySelector('#tbMCancel').addEventListener('click', closeModal);
    bg.addEventListener('click', function(e){ if (e.target === bg) closeModal(); });

    if (!isNew) {
      bg.querySelector('#tbMDel').addEventListener('click', async function() {
        if (!confirm('Delete this block?')) return;
        await Store.deleteBlock(block.id);
        closeModal();
      });
    }

    bg.querySelector('#tbMSave').addEventListener('click', async function() {
      var t = bg.querySelector('#tbMTitle').value.trim();
      if (!t) { bg.querySelector('#tbMTitle').focus(); return; }
      var sStr = bg.querySelector('#tbMStart').value;
      var eStr = bg.querySelector('#tbMEnd').value;
      var sMin = timeInputToMins(sStr);
      var eMin = timeInputToMins(eStr);
      if (isNaN(sMin) || isNaN(eMin) || eMin <= sMin) { alert('End time must be after start time.'); return; }
      var sDate = timelineToDate(dateStr, sMin);
      var eDate = timelineToDate(dateStr, eMin);
      var goalVal  = bg.querySelector('#tbMGoal').value;
      var notesVal = bg.querySelector('#tbMNotes').value.trim();
      var doneVal  = !isNew && bg.querySelector('#tbMDone').checked;

      var fields = {
        title:       t,
        start_time:  sDate.toISOString(),
        end_time:    eDate.toISOString(),
        category:    pickedCategory,
        color:       pickedColor,
        notes:       notesVal || null,
        linked_goal: goalVal  || null,
        completed:   isNew ? false : doneVal,
      };

      var saveBtn = bg.querySelector('#tbMSave');
      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      if (isNew) { await Store.createBlock(fields); }
      else       { await Store.updateBlock(block.id, fields); }
      closeModal();
    });

    titleInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter')  { e.preventDefault(); bg.querySelector('#tbMSave').click(); }
      if (e.key === 'Escape') closeModal();
    });
  }

  // ── Block element ─────────────────────────────────────────────────────────

  function makeBlockEl(block, tlEl) {
    var sDate  = new Date(block.start_time);
    var eDate  = new Date(block.end_time);
    var startM = minsFromTimeline(sDate);
    var durM   = Math.max(MIN_DUR, (eDate - sDate) / 60000);
    var top    = minToY(Math.max(0, startM));
    var height = minToY(durM);

    var now     = new Date();
    var isPast  = eDate < now;
    var isCur   = sDate <= now && eDate > now;

    var el = document.createElement('div');
    el.className = 'tb-block'
      + (isPast        ? ' tb-past'    : '')
      + (isCur         ? ' tb-cur'     : '')
      + (block.completed ? ' tb-done'  : '');
    el.style.top    = top + 'px';
    el.style.height = Math.max(height, MIN_DUR * PX_PER_MIN) + 'px';
    el.style.setProperty('--bc', block.color || '#4A9EFF');
    el.dataset.id = block.id;

    var inner = document.createElement('div');
    inner.className = 'tb-block-in';
    inner.innerHTML = '<span class="tb-block-ttl">' + esc(block.title) + '</span>'
      + '<span class="tb-block-t">' + formatTime(sDate) + ' – ' + formatTime(eDate) + '</span>'
      + (block.completed ? '<span class="tb-block-chk">✓</span>' : '')
      + (block.linked_goal ? '<span class="tb-block-link">🎯</span>' : '');
    el.appendChild(inner);

    var rh = document.createElement('div');
    rh.className = 'tb-rh';
    el.appendChild(rh);

    // Click body → edit
    inner.addEventListener('click', function(e) {
      e.stopPropagation();
      openModal(block, null);
    });

    wireDragMove(el, block);
    wireDragResize(rh, el, block);
    return el;
  }

  // ── Drag: move ────────────────────────────────────────────────────────────

  function wireDragMove(el, block) {
    var startY, startMins, dragging;
    var durMins = (new Date(block.end_time) - new Date(block.start_time)) / 60000;

    el.addEventListener('pointerdown', function(e) {
      if (e.target.classList.contains('tb-rh')) return;
      startY    = e.clientY;
      startMins = minsFromTimeline(new Date(block.start_time));
      dragging  = false;
      el.setPointerCapture(e.pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup',   onUp);
      el.addEventListener('pointercancel', onUp);
    });

    function onMove(e) {
      var dy = e.clientY - startY;
      if (!dragging && Math.abs(dy) > 5) { dragging = true; el.classList.add('tb-dragging'); }
      if (!dragging) return;
      var delta   = snapTo(yToMin(dy), SNAP_GRID);
      var newStart = Math.max(0, Math.min(startMins + delta, TOTAL_MINS - durMins));
      el.style.top = minToY(newStart) + 'px';
    }

    function onUp(e) {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup',   onUp);
      el.removeEventListener('pointercancel', onUp);
      el.classList.remove('tb-dragging');
      if (!dragging) return;
      var dy     = e.clientY - startY;
      var delta  = snapTo(yToMin(dy), SNAP_GRID);
      var newStartMins = snapTo(Math.max(0, Math.min(startMins + delta, TOTAL_MINS - durMins)), SNAP_GRID);
      var ns = timelineToDate(Store.dateStr, newStartMins);
      var ne = new Date(ns.getTime() + durMins * 60000);
      Store.updateBlock(block.id, { start_time: ns.toISOString(), end_time: ne.toISOString() });
    }
  }

  // ── Drag: resize ──────────────────────────────────────────────────────────

  function wireDragResize(rh, el, block) {
    var startY, startEndMins, dragging;
    var startMins = minsFromTimeline(new Date(block.start_time));

    rh.addEventListener('pointerdown', function(e) {
      e.stopPropagation();
      startY       = e.clientY;
      startEndMins = minsFromTimeline(new Date(block.end_time));
      dragging     = false;
      rh.setPointerCapture(e.pointerId);
      rh.addEventListener('pointermove', onMove);
      rh.addEventListener('pointerup',   onUp);
      rh.addEventListener('pointercancel', onUp);
    });

    function onMove(e) {
      dragging = true;
      var delta  = snapTo(yToMin(e.clientY - startY), SNAP_GRID);
      var newEnd = Math.max(startMins + MIN_DUR, Math.min(startEndMins + delta, TOTAL_MINS));
      el.style.height = minToY(newEnd - startMins) + 'px';
    }

    function onUp(e) {
      rh.removeEventListener('pointermove', onMove);
      rh.removeEventListener('pointerup',   onUp);
      rh.removeEventListener('pointercancel', onUp);
      if (!dragging) return;
      var delta  = snapTo(yToMin(e.clientY - startY), SNAP_GRID);
      var newEnd = snapTo(Math.max(startMins + MIN_DUR, Math.min(startEndMins + delta, TOTAL_MINS)), SNAP_GRID);
      var ne = timelineToDate(Store.dateStr, newEnd);
      Store.updateBlock(block.id, { end_time: ne.toISOString() });
    }
  }

  // ── Now indicator ─────────────────────────────────────────────────────────

  var _nowEl = null, _nowTimer = null;

  function updateNowLine() {
    if (!_nowEl) return;
    var now  = new Date();
    var mins = minsFromTimeline(now);
    if (mins < 0 || mins > TOTAL_MINS) { _nowEl.style.display = 'none'; return; }
    _nowEl.style.display = '';
    _nowEl.style.top = minToY(mins) + 'px';
    var t = _nowEl.querySelector('.tb-now-t');
    if (t) t.textContent = formatTime(now);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  function updateStats(blocks) {
    var el = document.getElementById('tbStats');
    if (!el) return;
    if (!blocks.length) { el.textContent = 'No blocks yet — tap the timeline to add one'; return; }
    function dur(b) { return Math.max(0, (new Date(b.end_time) - new Date(b.start_time)) / 60000); }
    function fmt(m) { var h = Math.floor(m/60), min = Math.round(m%60); return h > 0 ? h + 'h' + (min ? ' ' + min + 'm' : '') : min + 'm'; }
    var total = blocks.reduce(function(s,b){ return s + dur(b); }, 0);
    var done  = blocks.filter(function(b){ return b.completed; }).reduce(function(s,b){ return s + dur(b); }, 0);
    el.innerHTML = '<span class="tb-stat-done">' + fmt(done) + ' done</span>'
      + ' <span class="tb-stat-sep">·</span> '
      + fmt(total - done) + ' remaining'
      + ' <span class="tb-stat-sep">·</span> '
      + blocks.length + ' block' + (blocks.length === 1 ? '' : 's');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  var _tlEl = null;

  function renderBlocks(blocks) {
    if (!_tlEl) return;
    _tlEl.querySelectorAll('.tb-block').forEach(function(el){ el.remove(); });
    blocks.forEach(function(b){ _tlEl.appendChild(makeBlockEl(b, _tlEl)); });
    updateStats(blocks);
    updateNowLine();
  }

  // ── Week view state ───────────────────────────────────────────────────────────

  var _currentView       = 'day';
  var _currentWeekMonday = '';

  function getViewPref() { try { return localStorage.getItem('tb_view_pref') || 'day'; } catch(e) { return 'day'; } }
  function setViewPref(v) { try { localStorage.setItem('tb_view_pref', v); } catch(e) {} }

  function getMondayOf(dateStr) {
    var p = dateStr.split('-').map(Number);
    var d = new Date(p[0], p[1]-1, p[2]);
    var day = d.getDay();
    var diff = (day === 0) ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }

  function addDays(dateStr, n) {
    var p = dateStr.split('-').map(Number);
    var d = new Date(p[0], p[1]-1, p[2]);
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }

  function weekDays(mondayStr) {
    var days = [];
    for (var i = 0; i < 7; i++) days.push(addDays(mondayStr, i));
    return days;
  }

  function formatWeekRange(mondayStr) {
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var p = mondayStr.split('-').map(Number);
    var mo = new Date(p[0], p[1]-1, p[2]);
    var su = new Date(mo); su.setDate(mo.getDate() + 6);
    return months[mo.getMonth()] + ' ' + mo.getDate() + ' – ' +
      (su.getMonth() !== mo.getMonth() ? months[su.getMonth()] + ' ' : '') + su.getDate();
  }

  // ── Week-view render ──────────────────────────────────────────────────────────

  var _weekColNowEls = [];

  function renderWeek(blocks) {
    var wkEl = document.getElementById('tbWeekView');
    if (!wkEl) return;
    var today = getTodayStr();
    var days  = weekDays(_currentWeekMonday);

    // update range label
    var rangeEl = document.getElementById('tbWeekRange');
    if (rangeEl) rangeEl.textContent = formatWeekRange(_currentWeekMonday);

    // group blocks by date string
    var byDay = {};
    days.forEach(function(d) { byDay[d] = []; });
    blocks.forEach(function(b) {
      var ds = b.start_time.slice(0, 10);
      if (byDay[ds]) byDay[ds].push(b);
    });

    _weekColNowEls = [];
    wkEl.innerHTML = '';
    wkEl.style.display = 'flex';

    // Hour gutter
    var gutter = document.createElement('div');
    gutter.style.cssText = 'width:' + GUTTER_W + 'px;flex-shrink:0;position:relative;height:' + minToY(TOTAL_MINS) + 'px';
    for (var h = START_HOUR; h <= END_HOUR; h++) {
      var y = minToY((h - START_HOUR) * 60);
      var lbl = document.createElement('div');
      lbl.className = 'tb-hlbl';
      lbl.style.top = y + 'px';
      lbl.textContent = formatHourLabel(h === 24 ? 0 : h);
      gutter.appendChild(lbl);
    }
    wkEl.appendChild(gutter);

    // Day columns
    days.forEach(function(ds) {
      var isToday = (ds === today);
      var col = document.createElement('div');
      col.style.cssText = 'flex:1;min-width:0;position:relative;height:' + minToY(TOTAL_MINS) + 'px;border-left:1px solid var(--border,rgba(255,255,255,0.05));';
      if (isToday) col.style.background = 'rgba(107,227,164,0.03)';

      // Grid lines
      for (var h2 = START_HOUR; h2 < END_HOUR; h2++) {
        var y2 = minToY((h2 - START_HOUR) * 60);
        var line = document.createElement('div');
        line.style.cssText = 'position:absolute;left:0;right:0;top:' + y2 + 'px;height:1px;background:rgba(255,255,255,0.05);pointer-events:none;';
        col.appendChild(line);
        var half = document.createElement('div');
        half.style.cssText = 'position:absolute;left:0;right:0;top:' + (y2 + minToY(30)) + 'px;height:1px;background:rgba(255,255,255,0.025);pointer-events:none;';
        col.appendChild(half);
      }

      // Now line (today only)
      if (isToday) {
        var nowEl = document.createElement('div');
        nowEl.className = 'tb-now';
        nowEl.style.left = '0';
        nowEl.innerHTML = '';
        col.appendChild(nowEl);
        _weekColNowEls.push(nowEl);
        updateWeekNowLine();
      }

      // Blocks
      byDay[ds].forEach(function(b) {
        var bEl = makeBlockEl(b, col);
        bEl.style.left  = '3px';
        bEl.style.right = '3px';
        col.appendChild(bEl);
      });

      // Click to create
      col.addEventListener('click', function(e) {
        if (e.target.closest('.tb-block')) return;
        var rect = col.getBoundingClientRect();
        var y3   = e.clientY - rect.top;
        var mins = Math.max(0, Math.min(snapTo(yToMin(y3), CREATE_SNAP), TOTAL_MINS - 60));
        openModal(null, mins, ds);
      });

      wkEl.appendChild(col);
    });

    updateStats(blocks);
  }

  function updateWeekNowLine() {
    var now  = new Date();
    var mins = minsFromTimeline(now);
    _weekColNowEls.forEach(function(el) {
      if (mins < 0 || mins > TOTAL_MINS) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.style.top = minToY(mins) + 'px';
    });
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────

  function buildTimeline(container) {
    var tl = document.createElement('div');
    tl.className = 'tb-tl';
    tl.style.height = minToY(TOTAL_MINS) + 'px';

    // Hour rows
    for (var h = START_HOUR; h <= END_HOUR; h++) {
      var y = minToY((h - START_HOUR) * 60);

      var lbl = document.createElement('div');
      lbl.className = 'tb-hlbl';
      lbl.style.top = y + 'px';
      lbl.textContent = formatHourLabel(h === 24 ? 0 : h);
      tl.appendChild(lbl);

      if (h < END_HOUR) {
        var line = document.createElement('div');
        line.className = 'tb-hline';
        line.style.top = y + 'px';
        tl.appendChild(line);

        var halfLine = document.createElement('div');
        halfLine.className = 'tb-halfline';
        halfLine.style.top = minToY((h - START_HOUR) * 60 + 30) + 'px';
        tl.appendChild(halfLine);
      }
    }

    // Now line
    var nowEl = document.createElement('div');
    nowEl.className = 'tb-now';
    nowEl.innerHTML = '<span class="tb-now-t"></span>';
    tl.appendChild(nowEl);
    _nowEl = nowEl;

    // Click to create
    tl.addEventListener('click', function(e) {
      if (e.target.closest('.tb-block')) return;
      var rect = tl.getBoundingClientRect();
      var y    = e.clientY - rect.top;
      var mins = Math.max(0, Math.min(snapTo(yToMin(y), CREATE_SNAP), TOTAL_MINS - 60));
      openModal(null, mins);
    });

    container.appendChild(tl);
    _tlEl = tl;
  }

  function buildSection() {
    var dateStr = getTodayStr();
    var section = document.createElement('div');
    section.className = 'section';
    section.id = 'tbSection';

    // Section title
    var hdr = document.createElement('div');
    hdr.className = 'section-title';
    hdr.textContent = 'Time Blocking';
    section.appendChild(hdr);

    var card = document.createElement('div');
    card.className = 'gm-card tb-card';
    section.appendChild(card);

    // DAY | WEEK toggle
    var toggleBar = document.createElement('div');
    toggleBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:0 20px 14px;';

    var viewToggle = document.createElement('div');
    viewToggle.style.cssText = 'display:flex;gap:4px;';

    function makeViewBtn(label, value) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.view = value;
      btn.style.cssText = 'padding:5px 14px;border-radius:8px;font-family:inherit;font-size:11px;font-weight:700;letter-spacing:0.10em;text-transform:uppercase;cursor:pointer;transition:background 0.15s,color 0.15s;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);';
      btn.addEventListener('click', function() { switchView(btn.dataset.view); });
      return btn;
    }
    var dayBtn  = makeViewBtn('DAY',  'day');
    var weekBtn = makeViewBtn('WEEK', 'week');
    viewToggle.appendChild(dayBtn);
    viewToggle.appendChild(weekBtn);

    // Week navigation (hidden in day view)
    var weekNav = document.createElement('div');
    weekNav.id = 'tbWeekNav';
    weekNav.style.cssText = 'display:none;align-items:center;gap:8px;';
    var prevBtn = document.createElement('button');
    prevBtn.type = 'button'; prevBtn.textContent = '‹';
    prevBtn.style.cssText = 'border:1px solid rgba(255,255,255,0.10);border-radius:7px;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.6);font-size:15px;cursor:pointer;padding:3px 10px;';
    var rangeEl = document.createElement('span');
    rangeEl.id = 'tbWeekRange';
    rangeEl.style.cssText = 'font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);min-width:120px;text-align:center;';
    var nextBtn = document.createElement('button');
    nextBtn.type = 'button'; nextBtn.textContent = '›';
    nextBtn.style.cssText = prevBtn.style.cssText;
    var todayBtn = document.createElement('button');
    todayBtn.type = 'button'; todayBtn.textContent = 'Today';
    todayBtn.style.cssText = 'border:1px solid rgba(255,255,255,0.10);border-radius:7px;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);font-family:inherit;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;padding:4px 10px;';

    prevBtn.addEventListener('click',  function() { navWeek(-7); });
    nextBtn.addEventListener('click',  function() { navWeek(+7); });
    todayBtn.addEventListener('click', function() { goToThisWeek(); });

    weekNav.appendChild(prevBtn); weekNav.appendChild(rangeEl);
    weekNav.appendChild(nextBtn); weekNav.appendChild(todayBtn);

    toggleBar.appendChild(viewToggle);
    toggleBar.appendChild(weekNav);
    card.appendChild(toggleBar);

    var stats = document.createElement('div');
    stats.id = 'tbStats';
    stats.className = 'tb-stats';
    stats.textContent = 'Loading…';
    card.appendChild(stats);

    // Day view scroll + timeline
    var scroll = document.createElement('div');
    scroll.id = 'tbDayView';
    scroll.className = 'tb-scroll';
    card.appendChild(scroll);
    buildTimeline(scroll);

    // Week view container
    var weekWrap = document.createElement('div');
    weekWrap.id = 'tbWeekView';
    weekWrap.className = 'tb-scroll';
    weekWrap.style.overflowX = 'auto';
    card.appendChild(weekWrap);

    return section;
  }

  function switchView(view) {
    _currentView = view;
    setViewPref(view);
    var dayView  = document.getElementById('tbDayView');
    var weekView = document.getElementById('tbWeekView');
    var weekNav  = document.getElementById('tbWeekNav');

    // update button styles
    document.querySelectorAll('[data-view]').forEach(function(b) {
      var active = b.dataset.view === view;
      var cs = getComputedStyle(document.documentElement);
      b.style.background = active ? cs.getPropertyValue('--overlay-active').trim() : cs.getPropertyValue('--overlay-soft').trim();
      b.style.color      = active ? cs.getPropertyValue('--text-primary').trim() : cs.getPropertyValue('--text-secondary').trim();
      b.style.borderColor = active ? cs.getPropertyValue('--border-strong').trim() : cs.getPropertyValue('--border').trim();
    });

    if (view === 'day') {
      dayView.style.display  = '';
      weekView.style.display = 'none';
      weekNav.style.display  = 'none';
      Store.fetch();
    } else {
      dayView.style.display  = 'none';
      weekView.style.display = '';
      weekNav.style.display  = 'flex';
      Store.fetchWeek(_currentWeekMonday);
    }
  }

  function navWeek(days) {
    _currentWeekMonday = addDays(_currentWeekMonday, days);
    Store.fetchWeek(_currentWeekMonday);
  }

  function goToThisWeek() {
    _currentWeekMonday = getMondayOf(getTodayStr());
    Store.fetchWeek(_currentWeekMonday);
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    var page = document.querySelector('.page');
    if (!page) return;

    var section = buildSection();
    page.appendChild(section);

    _currentWeekMonday = getMondayOf(getTodayStr());
    _currentView = getViewPref();

    Store.init(getTodayStr());
    Store.on(renderBlocks);
    Store.onWeek(renderWeek);

    // Apply initial view
    switchView(_currentView);

    updateNowLine();
    if (_nowTimer) clearInterval(_nowTimer);
    _nowTimer = setInterval(function() { updateNowLine(); updateWeekNowLine(); }, 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // defer one tick so the page script finishes first
    setTimeout(init, 0);
  }
})();
