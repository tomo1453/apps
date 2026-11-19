/* 英語フレーズ集 — 言えるようになるまで覚えるフラッシュカード */
(() => {
  'use strict';

  const STORE_KEY = 'english-phrases-v1';
  const DAY = 24 * 60 * 60 * 1000;
  const REVIEW_DAYS = [5, 10, 14]; // 「覚えた」後の確認間隔（日）。3回続けて覚えたら「知ってる」へ
  const MILESTONES = [10, 25, 50];  // ＋全フレーズ達成
  const REQUEUE_GAP = 4;            // 「まだ」のカードを何枚後に再出題するか

  // ---------- 状態 ----------
  let phrases = [];
  let categories = [];
  let catById = {};
  let state = load();
  let queue = [];       // 出題待ちのフレーズID
  let current = null;   // 表示中のフレーズ
  let flipped = false;
  let busy = false;
  let session = newSession();

  function defaultState() {
    return {
      v: 1,
      cards: {},     // id -> { s: 'learning'|'review'|'known', stage, due, seen }
      days: {},      // 'YYYY-MM-DD' -> { n, got, known, later }
      settings: { goal: 20, rate: 0.9, autoSpeak: false, cat: 'all' },
      celebrated: [],
      bestCombo: 0,
      bestStreak: 0,
      total: 0,
    };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.v === 1) {
        const d = defaultState();
        return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
      }
    } catch (e) { /* 壊れていたら初期化 */ }
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 容量不足など */ }
  }
  function newSession() {
    return { n: 0, got: 0, known: 0, later: 0, combo: 0, maxCombo: 0 };
  }

  // ---------- 日付ユーティリティ ----------
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (days) => startOfDay() + days * DAY + 3 * 60 * 60 * 1000; // その日の午前3時以降に出題
  const todayRec = () => (state.days[ymd()] ||= { n: 0, got: 0, known: 0, later: 0 });

  function streak() {
    let d = new Date(); d.setHours(12, 0, 0, 0);
    if (!(state.days[ymd(d)]?.n > 0)) d = new Date(d.getTime() - DAY); // 今日まだなら昨日から数える
    let s = 0;
    while (state.days[ymd(d)]?.n > 0) { s++; d = new Date(d.getTime() - DAY); }
    return s;
  }

  // ---------- カード状態 ----------
  const card = (id) => state.cards[id];
  function statusOf(id) { return card(id)?.s || 'new'; }
  function isDue(id, now = Date.now()) {
    const c = card(id);
    return c && c.s === 'review' && c.due <= now;
  }
  function counts(filterCat) {
    const r = { total: 0, new: 0, learning: 0, review: 0, known: 0, due: 0 };
    for (const p of phrases) {
      if (filterCat && p.cat !== filterCat) continue;
      r.total++;
      const s = statusOf(p.id);
      r[s]++;
      if (isDue(p.id)) r.due++;
    }
    r.mastered = r.review + r.known; // 「覚えた」= 確認中 + 知ってる
    return r;
  }

  // ---------- 出題キュー ----------
  function eligible(p, now) {
    const cat = state.settings.cat;
    if (cat !== 'all' && p.cat !== cat) return false;
    const s = statusOf(p.id);
    if (s === 'known') return false;
    if (s === 'review' && card(p.id).due > now) return false;
    return true;
  }
  function buildQueue() {
    const now = Date.now();
    const list = phrases.filter((p) => eligible(p, now));
    const due = list.filter((p) => statusOf(p.id) === 'review').sort((a, b) => card(a.id).due - card(b.id).due);
    const learning = list.filter((p) => statusOf(p.id) === 'learning').sort((a, b) => (card(a.id).seen || 0) - (card(b.id).seen || 0));
    const fresh = list.filter((p) => statusOf(p.id) === 'new');
    queue = [...due, ...learning, ...fresh].map((p) => p.id);
  }
  // アプリに戻ってきたとき、期限を迎えた確認カードを先頭に差し込む
  function injectDue() {
    const now = Date.now();
    const due = phrases
      .filter((p) => eligible(p, now) && isDue(p.id, now) && !queue.includes(p.id) && p.id !== current?.id)
      .sort((a, b) => card(a.id).due - card(b.id).due)
      .map((p) => p.id);
    if (due.length) queue.unshift(...due);
    return due.length;
  }

  // ---------- 描画 ----------
  const $ = (id) => document.getElementById(id);

  function renderHeader() {
    const c = counts();
    $('mastered').textContent = c.mastered;
    $('total').textContent = c.total;
    $('reviewing').textContent = c.review;
    $('bar').style.width = c.total ? `${(c.mastered / c.total) * 100}%` : '0';
    $('streak').textContent = streak();
    const t = todayRec().n, g = state.settings.goal;
    $('today').textContent = t;
    $('goal').textContent = g;
    const gb = $('goalbar');
    gb.style.width = `${Math.min(100, (t / g) * 100)}%`;
    gb.classList.toggle('done', t >= g);
  }

  function catBadge(el, p) {
    const c = catById[p.cat];
    el.textContent = `${c.emoji} ${p.scene}`;
    el.style.background = c.color;
  }

  function showNext() {
    const cardEl = $('card');
    current = null;
    flipped = false;
    cardEl.classList.remove('flipped', 'leave-left', 'leave-right', 'leave-up');
    const id = queue.shift();
    const p = id && phrases.find((x) => x.id === id);
    if (!p) { showEmpty(); return; }
    current = p;
    $('empty').hidden = true;
    cardEl.hidden = false;
    $('answers').classList.remove('disabled');

    catBadge($('fCat'), p);
    catBadge($('bCat'), p);
    const c = card(p.id);
    let badge = '✨ NEW';
    if (c?.s === 'review') badge = `✅ 確認 ${c.stage + 1}/3`;
    else if (c?.s === 'learning') badge = '🔁 もう一度';
    $('fDue').textContent = badge;
    $('fIllust').innerHTML = window.drawScene ? window.drawScene(p) : '';
    $('fJa').textContent = p.ja;
    $('fNote').textContent = `📍 ${p.note}`;
    $('bEn').textContent = p.en;
    $('bAlt').textContent = p.alt;
    $('bJa').textContent = p.ja;

    const stage = c?.s === 'review' ? c.stage : -1;
    $('gotSub').textContent = stage >= 2 ? '「知ってる」へ' : `${REVIEW_DAYS[stage + 1]}日後に確認`;

    cardEl.classList.remove('enter'); void cardEl.offsetWidth; cardEl.classList.add('enter');
    renderQueueInfo();
  }

  function renderQueueInfo() {
    const now = Date.now();
    const rest = queue.length + (current ? 1 : 0);
    const dueN = [current?.id, ...queue].filter((id) => id && isDue(id, now)).length;
    $('queueInfo').textContent = rest ? `残り ${rest} 枚${dueN ? `（うち確認 ${dueN} 枚）` : ''}` : '';
  }

  function showEmpty() {
    $('card').hidden = true;
    $('empty').hidden = false;
    $('answers').classList.add('disabled');
    const c = counts(state.settings.cat === 'all' ? null : state.settings.cat);
    const next = phrases
      .filter((p) => statusOf(p.id) === 'review' && (state.settings.cat === 'all' || p.cat === state.settings.cat))
      .map((p) => card(p.id).due).sort((a, b) => a - b)[0];
    let msg = 'このカテゴリで今出題できるフレーズはありません！';
    if (c.known === c.total && c.total) msg = 'すべて「知ってる」になりました！すごい！';
    else if (next) {
      const d = new Date(next);
      msg += `<br>次の確認は ${d.getMonth() + 1}/${d.getDate()} からです。`;
    }
    $('emptyMsg').innerHTML = msg;
    $('queueInfo').textContent = '';
  }

  function flip() {
    if (!current || busy) return;
    flipped = !flipped;
    $('card').classList.toggle('flipped', flipped);
    if (flipped && state.settings.autoSpeak) speak(current.en);
  }

  function renderCombo(bump) {
    const el = $('combo');
    const n = session.combo;
    el.textContent = n >= 2 ? `🔥 ${n} COMBO` : '';
    el.classList.toggle('show', n >= 2);
    if (bump && n >= 2) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }

  // ---------- 回答処理 ----------
  function answer(kind) {
    if (!current || busy) return;
    busy = true;
    const p = current;
    const now = Date.now();
    const before = counts().mastered;
    const c = state.cards[p.id] || { s: 'new', stage: 0, due: 0 };
    c.seen = now;
    let toastMsg = '';

    if (kind === 'later') {
      c.s = 'learning'; c.stage = 0; c.due = 0;
      queue.splice(Math.min(REQUEUE_GAP, queue.length), 0, p.id);
    } else if (kind === 'got') {
      if (c.s === 'review') {
        if (c.stage >= REVIEW_DAYS.length - 1) {
          c.s = 'known'; c.auto = true;
          toastMsg = '🏆 3回連続クリア！「知ってる」に移動しました';
        } else {
          c.stage += 1; c.due = addDays(REVIEW_DAYS[c.stage]);
          toastMsg = `👍 ${REVIEW_DAYS[c.stage]}日後にもう一度確認します`;
        }
      } else {
        c.s = 'review'; c.stage = 0; c.due = addDays(REVIEW_DAYS[0]);
      }
    } else if (kind === 'known') {
      c.s = 'known';
    }
    state.cards[p.id] = c;

    // 記録
    const t = todayRec();
    t.n++; t[kind]++;
    state.total++;
    session.n++; session[kind]++;
    if (kind === 'later') session.combo = 0; else session.combo++;
    session.maxCombo = Math.max(session.maxCombo, session.combo);
    state.bestCombo = Math.max(state.bestCombo, session.combo);
    state.bestStreak = Math.max(state.bestStreak, streak());
    save();

    renderHeader();
    renderCombo(kind !== 'later');
    if (toastMsg) toast(toastMsg);
    else if ([5, 10, 20, 30, 50].includes(session.combo)) toast(`🔥 ${session.combo}コンボ！その調子！`);

    // カードを飛ばすアニメーション
    const cls = kind === 'later' ? 'leave-left' : kind === 'got' ? 'leave-right' : 'leave-up';
    const cardEl = $('card');
    if (!flipped) cardEl.classList.add('flipped');
    cardEl.classList.add(cls);

    setTimeout(() => {
      busy = false;
      showNext();
      checkCelebrations(before, t.n);
    }, 260);
  }

  // ---------- お祝い ----------
  function checkCelebrations(before, todayN) {
    const c = counts();
    const total = c.total;
    const hits = [...MILESTONES.filter((m) => m < total), total]
      .filter((m) => before < m && c.mastered >= m && !state.celebrated.includes(m));
    if (hits.length) {
      const m = Math.max(...hits);
      hits.forEach((h) => state.celebrated.push(h));
      save();
      const all = m === total;
      celebrate(
        all ? '👑' : m >= 50 ? '🏆' : m >= 25 ? '🌟' : '🎉',
        all ? '全フレーズ達成！' : `${m}フレーズ達成！`,
        all ? `全${total}フレーズを覚えました！本当にすごい！<br>確認テストも忘れずに。` : `覚えたフレーズが ${m} 個になりました！<br>この調子で続けましょう。`,
      );
      return;
    }
    if (todayN === state.settings.goal) {
      celebrate('🎯', '今日の目標達成！', `今日は ${todayN} 枚学習しました。<br>連続 ${streak()} 日目です！`, true);
    }
  }

  function celebrate(icon, title, text, small) {
    confetti(small ? 60 : 140);
    openModal(`
      <div class="big">${icon}</div>
      <h3>${title}</h3>
      <p>${text}</p>
      <button class="btn primary" data-close>続ける</button>`);
  }

  function confetti(n) {
    const box = $('confetti');
    const colors = ['#FF5C8A', '#FF9F1C', '#FFD23F', '#2EC4B6', '#4F8CFF', '#8B5CF6'];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = colors[i % colors.length];
      el.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`);
      el.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
      el.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
      el.style.animationDelay = `${Math.random() * 0.5}s`;
      if (Math.random() < 0.4) el.style.borderRadius = '50%';
      box.appendChild(el);
      setTimeout(() => el.remove(), 4200);
    }
  }

  function openModal(html) {
    $('modalBox').innerHTML = html;
    $('modal').hidden = false;
  }
  function closeModal() { $('modal').hidden = true; }

  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- 今日の成果 ----------
  function showSummary() {
    const t = todayRec();
    const c = counts();
    const g = state.settings.goal;
    const msg = t.n === 0 ? 'まだ今日は学習していません。1枚だけでも始めてみましょう！'
      : t.n >= g ? `目標の ${g} 枚を達成！おつかれさまでした 🎉`
      : `目標まであと ${g - t.n} 枚。また後で続けましょう！`;
    openModal(`
      <div class="big">${t.n >= g ? '🏅' : t.n ? '🌱' : '📖'}</div>
      <h3>今日の成果</h3>
      <div class="summary">
        <div><b>${t.n}</b><span>学習した枚数</span></div>
        <div><b>${t.got + t.known}</b><span>覚えた・知ってる</span></div>
        <div><b>${t.later}</b><span>まだ（復習中）</span></div>
        <div><b>${session.maxCombo}</b><span>今回の最高コンボ</span></div>
        <div><b>${streak()}</b><span>連続学習日数</span></div>
        <div><b>${Math.min(100, Math.round((t.n / g) * 100))}%</b><span>今日の目標達成率</span></div>
      </div>
      <p>${msg}<br>覚えた ${c.mastered} / ${c.total}・確認中 ${c.review} 件</p>
      <button class="btn primary" data-close>続ける</button>`);
    if (t.n >= g) confetti(60);
  }

  // ---------- 達成率 ----------
  function renderStats() {
    const box = $('catStats');
    box.innerHTML = '';
    for (const cat of categories) {
      const c = counts(cat.id);
      const pct = c.total ? Math.round((c.mastered / c.total) * 100) : 0;
      const div = document.createElement('div');
      div.className = 'cat-stat';
      div.style.setProperty('--c', cat.color);
      div.innerHTML = `
        <div class="head"><span>${cat.emoji} ${cat.name}</span><span class="pct" style="color:${cat.color}">${pct}%</span></div>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="meta">
          <span>覚えた ${c.mastered}/${c.total}</span><span>確認中 ${c.review}</span><span>知ってる ${c.known}</span><span>練習中 ${c.learning}</span>
          <span style="flex:1"></span><button class="study-btn" data-cat="${cat.id}">学習する ▶</button>
        </div>`;
      box.appendChild(div);
    }
    $('sStreak').textContent = streak();
    $('sBestStreak').textContent = Math.max(state.bestStreak, streak());
    $('sBestCombo').textContent = state.bestCombo;
    $('sTotal').textContent = state.total;

    const week = $('week');
    week.innerHTML = '';
    const g = state.settings.goal;
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      const n = state.days[ymd(d)]?.n || 0;
      const h = Math.min(100, (n / g) * 100);
      week.insertAdjacentHTML('beforeend', `
        <div class="day"><b>${n || ''}</b><div class="col"><i class="${n >= g ? 'done' : ''}" style="height:${h}%"></i></div>${i === 0 ? '今日' : days[d.getDay()]}</div>`);
    }
  }

  // ---------- 一覧 ----------
  const STATUS_LABEL = { new: '未学習', learning: '練習中', review: '確認中', known: '知ってる' };
  function renderList() {
    const cat = $('listCat').value;
    const st = $('listStatus').value;
    const ul = $('plist');
    const items = phrases.filter((p) => (cat === 'all' || p.cat === cat) && (st === 'all' || statusOf(p.id) === st));
    ul.innerHTML = items.length ? '' : '<li class="empty-li">該当するフレーズはありません</li>';
    const frag = document.createDocumentFragment();
    for (const p of items) {
      const s = statusOf(p.id);
      const c = card(p.id);
      let extra = '';
      if (s === 'review') { const d = new Date(c.due); extra = ` ${d.getMonth() + 1}/${d.getDate()}`; }
      const li = document.createElement('li');
      li.innerHTML = `
        <button class="sp" data-say="${p.id}" aria-label="読み上げ">🔊</button>
        <div class="txt"><div class="en"></div><div class="jp"><span class="st ${s}">${STATUS_LABEL[s]}${extra}</span><span class="ja-t"></span></div></div>
        ${s === 'known' ? `<button class="act" data-restore="${p.id}">出題に戻す</button>` : ''}`;
      li.querySelector('.en').textContent = p.en;
      li.querySelector('.ja-t').textContent = `${p.ja}（${p.scene}）`;
      frag.appendChild(li);
    }
    ul.appendChild(frag);
  }

  function restore(id) {
    state.cards[id] = { s: 'learning', stage: 0, due: 0, seen: 0 };
    save();
    if (!queue.includes(id) && current?.id !== id) queue.unshift(id);
    renderHeader();
    renderList();
    toast('↩️ 出題に戻しました');
  }

  // ---------- 読み上げ ----------
  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices().filter((v) => /en[-_]US/i.test(v.lang));
    const pref = ['Samantha', 'Ava', 'Allison', 'Google US English', 'Alex'];
    voice = pref.map((n) => vs.find((v) => v.name.includes(n))).find(Boolean) || vs.find((v) => v.localService) || vs[0] || null;
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('この端末は読み上げに対応していません'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    if (voice) u.voice = voice;
    u.rate = Number(state.settings.rate) || 0.9;
    speechSynthesis.speak(u);
  }

  // ---------- 画面切り替え ----------
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === name));
    document.querySelectorAll('.tab[data-screen]').forEach((t) => t.classList.toggle('active', t.dataset.screen === name));
    if (name === 'stats') renderStats();
    if (name === 'list') renderList();
    if (name === 'settings') renderSettings();
  }

  function setCategory(cat) {
    state.settings.cat = cat;
    save();
    $('catFilter').value = cat;
    buildQueue();
    showNext();
  }

  function renderSettings() {
    $('goalVal').textContent = state.settings.goal;
    $('rate').value = String(state.settings.rate);
    $('autoSpeak').checked = !!state.settings.autoSpeak;
  }

  // ---------- イベント ----------
  function bind() {
    const cardEl = $('card');
    cardEl.addEventListener('click', (e) => { if (!e.target.closest('.speak')) flip(); });
    $('speakBtn').addEventListener('click', (e) => { e.stopPropagation(); current && speak(current.en); });
    $('speakAltBtn').addEventListener('click', (e) => { e.stopPropagation(); current && speak(current.alt); });
    document.querySelectorAll('[data-ans]').forEach((b) => b.addEventListener('click', () => answer(b.dataset.ans)));

    document.querySelectorAll('.tab[data-screen]').forEach((t) => t.addEventListener('click', () => showScreen(t.dataset.screen)));
    $('finishBtn').addEventListener('click', showSummary);
    $('emptyFinish').addEventListener('click', showSummary);
    $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });

    $('catFilter').addEventListener('change', (e) => setCategory(e.target.value));
    $('catStats').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (b) { setCategory(b.dataset.cat); showScreen('study'); }
    });

    $('listCat').addEventListener('change', renderList);
    $('listStatus').addEventListener('change', renderList);
    $('plist').addEventListener('click', (e) => {
      const r = e.target.closest('[data-restore]');
      if (r) return restore(r.dataset.restore);
      const s = e.target.closest('[data-say]');
      if (s) speak(phrases.find((p) => p.id === s.dataset.say).en);
    });

    const setGoal = (d) => {
      state.settings.goal = Math.max(5, Math.min(200, state.settings.goal + d));
      save(); renderSettings(); renderHeader();
    };
    $('goalMinus').addEventListener('click', () => setGoal(-5));
    $('goalPlus').addEventListener('click', () => setGoal(5));
    $('rate').addEventListener('change', (e) => { state.settings.rate = Number(e.target.value); save(); speak('How are you doing today?'); });
    $('autoSpeak').addEventListener('change', (e) => { state.settings.autoSpeak = e.target.checked; save(); });
    $('resetBtn').addEventListener('click', () => {
      if (!confirm('学習記録をすべて消去します。よろしいですか？')) return;
      const settings = state.settings;
      state = defaultState();
      state.settings = settings;
      save();
      session = newSession();
      buildQueue(); showNext(); renderHeader(); renderCombo(); renderSettings();
      toast('リセットしました');
    });

    document.addEventListener('keydown', (e) => {
      if (!$('modal').hidden) { if (e.key === 'Enter' || e.key === 'Escape') closeModal(); return; }
      if (!$('study').classList.contains('active') || e.target.tagName === 'SELECT') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      else if (e.key === '1') answer('later');
      else if (e.key === '2') answer('got');
      else if (e.key === '3') answer('known');
      else if (e.key === 's' && current) speak(current.en);
    });

    // 再表示時：日付が変わっていたり、期限を迎えたカードがあれば優先して出題
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !phrases.length) return;
      const n = injectDue();
      renderHeader();
      if (n) {
        toast(`⏰ 確認の時期になったフレーズが ${n} 件あります`);
        if (!current) showNext(); else renderQueueInfo();
      }
    });

    if ('speechSynthesis' in window) {
      pickVoice();
      speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
    }
  }

  function fillCategorySelects() {
    const opts = ['<option value="all">📚 すべてのカテゴリ</option>',
      ...categories.map((c) => `<option value="${c.id}">${c.emoji} ${c.name}</option>`)].join('');
    $('catFilter').innerHTML = opts;
    $('listCat').innerHTML = opts;
    if (state.settings.cat !== 'all' && !catById[state.settings.cat]) state.settings.cat = 'all';
    $('catFilter').value = state.settings.cat;
  }

  // ---------- 起動 ----------
  async function init() {
    bind();
    try {
      const res = await fetch('phrases.json', { cache: 'no-cache' });
      const data = await res.json();
      categories = data.categories;
      catById = Object.fromEntries(categories.map((c) => [c.id, c]));
      const seen = new Set();
      phrases = data.phrases.filter((p) => catById[p.cat] && p.id && !seen.has(p.id) && seen.add(p.id));
    } catch (e) {
      $('empty').hidden = false;
      $('card').hidden = true;
      $('emptyMsg').textContent = 'フレーズデータを読み込めませんでした。Webサーバー経由で開いてください。';
      return;
    }
    fillCategorySelects();
    buildQueue();
    renderHeader();
    renderCombo();
    showNext();
    const due = counts().due;
    if (due) toast(`⏰ 確認の時期になったフレーズが ${due} 件あります`);
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  init();
})();
