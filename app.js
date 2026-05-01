// ============================================================
// SOUND ENGINE
// ============================================================
let sfxEnabled = true;
let tickEnabled = true;
let alarmEnabled = true;
const soundEnabled = () => sfxEnabled || tickEnabled || alarmEnabled;

function toggleSFX(el) {
  sfxEnabled = el.checked;
}
function toggleTick(el) {
  tickEnabled = el.checked;
}
function toggleAlarm(el) {
  alarmEnabled = el.checked;
}

// Theme toggle (dark/light)
function toggleTheme(el) {
  const theme = el.checked ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ak_theme', theme);
}

// Apply saved theme on load
(function() {
  const saved = localStorage.getItem('ak_theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    setTimeout(() => { const t = document.getElementById('themeToggle'); if (t) t.checked = true; }, 0);
  }
})();

// Settings panel controls
function openSettings() {
  document.getElementById('settingsOverlay').classList.add('open');
  document.getElementById('settingsBtn').style.transform = 'rotate(90deg)';
}
function closeSettings(e) {
  if (e.target === document.getElementById('settingsOverlay')) {
    document.getElementById('settingsOverlay').classList.remove('open');
    document.getElementById('settingsBtn').style.transform = '';
  }
}
function switchTab(name, btn) {
  document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('pane-' + name).classList.add('active');
}

// ============================================================
// PROFILE / AUTH (localStorage mock)
// ============================================================
let currentUser = JSON.parse(localStorage.getItem('ak_user') || 'null');

function renderProfilePane() {
  if (currentUser) {
    document.getElementById('profile-signed-out').classList.add('hidden');
    document.getElementById('profile-signed-in').classList.remove('hidden');
    document.getElementById('p-display-name').textContent = currentUser.name;
    document.getElementById('p-display-email').textContent = currentUser.email;
    document.getElementById('p-games-played').textContent = currentUser.gamesPlayed || 0;
    document.getElementById('p-high-score').textContent = currentUser.highScore || 0;
  } else {
    document.getElementById('profile-signed-out').classList.remove('hidden');
    document.getElementById('profile-signed-in').classList.add('hidden');
  }
}

function handleSignIn() {
  const email = document.getElementById('p-email').value.trim();
  const password = document.getElementById('p-password').value;
  if (!email || !password) { alert('Please enter your email and password.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email address.'); return; }
  if (password.length < 6) { alert('Password must be at least 6 characters.'); return; }
  const stored = JSON.parse(localStorage.getItem('ak_users') || '{}');
  if (!stored[email]) {
    stored[email] = { email, name: email.split('@')[0], gamesPlayed: 0, highScore: 0 };
    localStorage.setItem('ak_users', JSON.stringify(stored));
  }
  currentUser = stored[email];
  localStorage.setItem('ak_user', JSON.stringify(currentUser));
  renderProfilePane();
  playCorrect();
}

function handleSignOut() {
  currentUser = null;
  localStorage.removeItem('ak_user');
  renderProfilePane();
  document.getElementById('p-email').value = '';
  document.getElementById('p-password').value = '';
}

function saveScore(pts) {
  if (!currentUser) return;
  currentUser.gamesPlayed = (currentUser.gamesPlayed || 0) + 1;
  if (pts > (currentUser.highScore || 0)) currentUser.highScore = pts;
  localStorage.setItem('ak_user', JSON.stringify(currentUser));
  const stored = JSON.parse(localStorage.getItem('ak_users') || '{}');
  stored[currentUser.email] = currentUser;
  localStorage.setItem('ak_users', JSON.stringify(stored));
}

async function ensureAudio() {
  if (Tone.context.state !== 'running') {
    await Tone.start();
  }
}

// FIX: All sound functions now dispose their synths after playback to prevent memory leaks.
function playClick() {
  if (!sfxEnabled) return;
  ensureAudio().then(() => {
    const synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
    }).toDestination();
    synth.triggerAttackRelease("C5", "32n");
    setTimeout(() => synth.dispose(), 300);
  });
}

function playCorrect() {
  if (!sfxEnabled) return;
  ensureAudio().then(() => {
    const poly = new Tone.PolySynth(Tone.Synth).toDestination();
    poly.set({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 } });
    poly.triggerAttackRelease(["C5","E5","G5"], "8n");
    setTimeout(() => poly.dispose(), 1200);
  });
}

function playWrong() {
  if (!sfxEnabled) return;
  ensureAudio().then(() => {
    const synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
    }).toDestination();
    synth.triggerAttackRelease("C2", "8n");
    setTimeout(() => synth.dispose(), 700);
  });
}

function playTick() {
  if (!tickEnabled) return;
  ensureAudio().then(() => {
    const synth = new Tone.MembraneSynth({
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
    }).toDestination();
    synth.triggerAttackRelease("G3", "32n");
    setTimeout(() => synth.dispose(), 300);
  });
}

function playAlarm() {
  if (!alarmEnabled) return;
  ensureAudio().then(() => {
    const synth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.1 }
    }).toDestination();
    synth.triggerAttackRelease("A2", "4n");
    setTimeout(() => synth.triggerAttackRelease("A2", "4n"), 300);
    setTimeout(() => synth.triggerAttackRelease("A2", "4n"), 600);
    setTimeout(() => synth.dispose(), 1500);
  });
}

// ============================================================
// SCREEN MANAGER
// ============================================================
let lastGameType = null;

function showScreen(id) {
  playClick();
  clearInterval(ch.timer);
  clearInterval(tr.timer);
  clearInterval(fl.timer);
  document.getElementById('round-overlay').classList.add('hidden');
  document.getElementById('countdown-overlay').classList.add('hidden');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  if (id === 'landing') renderGameHistory();
}

function goToSetup(game) {
  lastGameType = game;
  initSetup(game);
  showScreen(game + '-setup');
}

// ============================================================
// TEAM/PLAYER CONFIG
// ============================================================
const TEAM_COLORS = ['#00c8ff','#00ff88','#ffe600','#ff2244','#ff8c00','#cc44ff'];
const gameConfig = {
  chronicles: { teams: [], rounds: 3, time: 60 },
  trivia: { players: [], rounds: 5, time: 30, category: 'general' },
  flags: { players: [], rounds: 5, time: 15, level: 'easy' }
};

function initSetup(game) {
  if (game === 'chronicles') {
    gameConfig.chronicles.teams = [
      { name: 'Team 1', score: 0, rounds: 0 },
      { name: 'Team 2', score: 0, rounds: 0 }
    ];
    renderTeams('chronicles');
  } else if (game === 'trivia') {
    gameConfig.trivia.players = [
      { name: 'Player 1', score: 0 },
      { name: 'Player 2', score: 0 }
    ];
    renderTeams('trivia');
    // FIX: pass silent=true so initSetup doesn't trigger a second click sound
    // (showScreen already plays one via goToSetup)
    selectCategory('general', true);
  } else if (game === 'flags') {
    gameConfig.flags.players = [
      { name: 'Player 1', score: 0 },
      { name: 'Player 2', score: 0 }
    ];
    renderTeams('flags');
    // FIX: same — silent init
    selectLevel('easy', true);
  }
}

function renderTeams(game) {
  const isChronicles = game === 'chronicles';
  const list = isChronicles ? gameConfig.chronicles.teams : gameConfig[game].players;
  const containerId = isChronicles ? 'chronicles-teams' : game + '-players';
  const container = document.getElementById(containerId);
  const label = isChronicles ? 'Team' : 'Player';
  container.innerHTML = '';
  list.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'team-item';
    div.innerHTML = `
      <div class="team-color-dot" style="background:${TEAM_COLORS[i % TEAM_COLORS.length]}"></div>
      <input class="team-input" type="text" value="${t.name}" placeholder="${label} ${i+1}" oninput="updateTeamName('${game}', ${i}, this.value)">
      ${list.length > 1 ? `<button class="team-remove-btn" onclick="removeTeam('${game}', ${i})"><i class="fas fa-times"></i></button>` : ''}
    `;
    container.appendChild(div);
  });
}

function addTeam(game) {
  playClick();
  const isChronicles = game === 'chronicles';
  const list = isChronicles ? gameConfig.chronicles.teams : gameConfig[game].players;
  const max = isChronicles ? 6 : 8;
  const label = isChronicles ? 'Team' : 'Player';
  if (list.length >= max) return;
  const n = list.length + 1;
  list.push({ name: `${label} ${n}`, score: 0, rounds: 0 });
  renderTeams(game);
}

function removeTeam(game, idx) {
  playClick();
  const isChronicles = game === 'chronicles';
  const list = isChronicles ? gameConfig.chronicles.teams : gameConfig[game].players;
  if (list.length <= 1) return;
  list.splice(idx, 1);
  renderTeams(game);
}

function updateTeamName(game, idx, val) {
  const isChronicles = game === 'chronicles';
  const list = isChronicles ? gameConfig.chronicles.teams : gameConfig[game].players;
  list[idx].name = val || (isChronicles ? `Team ${idx+1}` : `Player ${idx+1}`);
}

const numLimits = {
  'chronicles-rounds': [1, 10],
  'trivia-rounds': [3, 15],
  'flags-rounds': [3, 15]
};

function changeNum(id, delta) {
  playClick();
  const el = document.getElementById(id);
  let val = parseInt(el.textContent);
  const [min, max] = numLimits[id] || [1, 10];
  val = Math.max(min, Math.min(max, val + delta));
  el.textContent = val;
  const game = id.split('-')[0];
  gameConfig[game].rounds = val;
}

function selectTime(game, val, btn) {
  playClick();
  gameConfig[game].time = val;
  document.querySelectorAll(`#${game}-time-opts .time-opt`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// FIX: Added `silent` param so initSetup can set the default without playing a double click.
function selectCategory(cat, silent = false) {
  if (!silent) playClick();
  gameConfig.trivia.category = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.style.borderColor = '');
  const btn = document.getElementById('cat-' + cat);
  if (btn) btn.style.borderColor = 'var(--neon-green)';
}

// FIX: Same silent param for level selection.
function selectLevel(lvl, silent = false) {
  if (!silent) playClick();
  gameConfig.flags.level = lvl;
  document.getElementById('lvl-easy').style.borderColor = lvl === 'easy' ? 'var(--neon-green)' : '';
  document.getElementById('lvl-hard').style.borderColor = lvl === 'hard' ? 'var(--neon-red)' : '';
}

// ============================================================
// CHRONICLES GAME ENGINE
// ============================================================
const CHRONICLES_WORDS = [
  "Wangari Maathai","William Ruto","Raila Odinga","Matatu","Unga","Safari Rally",
  "Nyama Choma","Safaricom","M-Pesa","Chapati","Boda Boda","Sukuma Wiki","Mt Kenya",
  "Maasai Mara","Riggy G","Zakayo","Smocha","Mayai Pasua","Mutura","Ugali","Githeri",
  "Uhuru Kenyatta","Daniel arap Moi","Kibaki","Mombasa","Kisumu","Nakuru","Eldoret",
  "Safari","Masai","Rift Valley","Lake Victoria","Tana River","Nairobi","Kibera",
  "Harambee","Uhuru Park","KBS Bus","Ngong Hills","Karura Forest","Dagoretti","Jua Kali",
  "Mama Mboga","Chokaa","Kanjo","Askari","Mkokoteni","Wamashati","Mjengo","Biashara",
  "Oliech","Eliud Kipchoge","David Rudisha","Tirop","Cheruiyot","Omanyala","Harambee Stars",
  "Sauti Sol","Nameless","Nyashinski","Octopizzo","Mejja","Diamond","Khaligraph Jones",
  "Tusker","Keg","Muratina","Chang'aa","Busaa","Smokey","Miraa","Khat"
];

let ch = {
  teams: [], currentTeamIdx: 0, currentRound: 1, totalRounds: 3,
  timeLeft: 60, timer: null, score: 0,
  queue: [], skipped: [], word: ''
};

function startChronicles() {
  const cfg = gameConfig.chronicles;
  ch.teams = cfg.teams.map(t => ({ ...t, score: 0, rounds: 0 }));
  ch.totalRounds = cfg.rounds;
  ch.timeEach = cfg.time;
  ch.currentTeamIdx = 0;
  ch.currentRound = 1;
  showScreen('chronicles-game');
  showGetReadyOverlay();
}

function showGetReadyOverlay() {
  const overlay = document.getElementById('round-overlay');
  document.getElementById('overlay-getready-state').classList.remove('hidden');
  document.getElementById('overlay-endturn-state').classList.add('hidden');
  document.getElementById('overlay-handover-state').classList.add('hidden');

  const team = ch.teams[0];
  document.getElementById('overlay-first-team-name').textContent = team.name;
  document.getElementById('overlay-first-meta').textContent = `Round 1 of ${ch.totalRounds} • ${ch.timeEach}s per turn`;

  overlay.classList.remove('hidden');
  const inner = overlay.querySelector('.overlay-inner');
  inner.style.animation = 'none';
  inner.offsetHeight;
  inner.style.animation = '';
  document.getElementById('overlay-start-btn').onclick = () => {
    overlay.classList.add('hidden');
    runCountdown(chroniclesStartTurn);
  };
}

function showEndTurnOverlay(reason) {
  const overlay = document.getElementById('round-overlay');
  document.getElementById('overlay-getready-state').classList.add('hidden');
  document.getElementById('overlay-endturn-state').classList.remove('hidden');
  document.getElementById('overlay-handover-state').classList.add('hidden');

  const playedTeam = ch.teams[ch.currentTeamIdx];
  const nextTeamIdx = (ch.currentTeamIdx + 1) % ch.teams.length;
  const nextTeam = ch.teams[nextTeamIdx];

  const nextRound = ch.currentRound + (nextTeamIdx === 0 ? 1 : 0);
  const gameOver = nextTeamIdx === 0 && ch.currentRound >= ch.totalRounds;

  document.getElementById('overlay-end-icon').textContent = reason === 'allwords' ? '🎉' : '⏰';
  document.getElementById('overlay-end-badge').textContent = reason === 'allwords' ? 'ALL WORDS DONE!' : "TIME'S UP!";

  document.getElementById('overlay-played-team').textContent = playedTeam.name;
  document.getElementById('overlay-round-score').textContent = ch.score;
  document.getElementById('overlay-total-score').textContent = playedTeam.score;

  const sbEl = document.getElementById('overlay-scoreboard');
  const sorted = [...ch.teams].sort((a, b) => b.score - a.score);
  sbEl.innerHTML = sorted.map((t, i) => `
    <div class="overlay-sb-row ${t === playedTeam ? 'highlight' : ''}">
      <div class="overlay-sb-dot" style="background:${TEAM_COLORS[ch.teams.indexOf(t) % TEAM_COLORS.length]}"></div>
      <span class="overlay-sb-name">${i === 0 ? '🥇 ' : ''}${t.name}</span>
      <span class="overlay-sb-pts">${t.score}</span>
    </div>
  `).join('');

  const nextSection = document.getElementById('overlay-next-section');
  const finalSection = document.getElementById('overlay-final-section');

  if (gameOver) {
    nextSection.classList.add('hidden');
    finalSection.classList.remove('hidden');
    document.getElementById('overlay-results-btn').onclick = () => {
      overlay.classList.add('hidden');
      endChronicles();
    };
  } else {
    nextSection.classList.remove('hidden');
    finalSection.classList.add('hidden');
    document.getElementById('overlay-next-team-name').textContent = nextTeam.name;
    document.getElementById('overlay-next-meta').textContent = `Round ${nextRound} of ${ch.totalRounds} • ${ch.timeEach}s`;

    document.getElementById('overlay-next-start-btn').innerHTML = '📱 HAND OVER THE PHONE';
    document.getElementById('overlay-next-start-btn').onclick = () => {
      showHandover(nextTeam.name, () => {
        overlay.classList.add('hidden');
        ch.score = 0;
        ch.currentTeamIdx = nextTeamIdx;
        if (nextTeamIdx === 0) ch.currentRound++;
        runCountdown(chroniclesStartTurn);
      });
    };
  }

  overlay.classList.remove('hidden');
  const inner2 = overlay.querySelector('.overlay-inner');
  inner2.style.animation = 'none';
  inner2.offsetHeight;
  inner2.style.animation = '';
}

function chroniclesStartTurn() {
  clearInterval(ch.timer);
  ch.score = 0;
  ch.timeLeft = ch.timeEach;
  const shuffled = [...CHRONICLES_WORDS].sort(() => Math.random() - 0.5);
  ch.queue = shuffled.slice(0, 8);
  ch.skipped = [];
  ch.word = '';

  const team = ch.teams[ch.currentTeamIdx];
  document.getElementById('ch-team-name').textContent = team.name;
  document.getElementById('ch-round-label').textContent = `Round ${ch.currentRound}/${ch.totalRounds}`;
  document.getElementById('ch-score').textContent = '0';
  document.getElementById('ch-timer').textContent = ch.timeLeft;
  document.getElementById('ch-timer').classList.remove('warning');

  chroniclesNextWord();
  ch.timer = setInterval(chroniclesTick, 1000);
}

function chroniclesNextWord() {
  const card = document.getElementById('ch-word-card');
  const badge = document.getElementById('ch-review-badge');
  const hint = document.getElementById('ch-hint');
  card.classList.remove('review-mode');
  badge.classList.add('hidden');

  if (ch.queue.length > 0) {
    ch.word = ch.queue.shift();
    document.getElementById('ch-word').textContent = ch.word;
    hint.textContent = "Describe without saying the word!";
  } else if (ch.skipped.length > 0) {
    ch.word = ch.skipped.shift();
    document.getElementById('ch-word').textContent = ch.word;
    card.classList.add('review-mode');
    badge.classList.remove('hidden');
    hint.textContent = "Reviewing skipped word!";
  } else {
    clearInterval(ch.timer);
    chroniclesEndTurn('allwords');
  }
}

function chroniclesTick() {
  ch.timeLeft--;
  const el = document.getElementById('ch-timer');
  el.textContent = ch.timeLeft;
  if (ch.timeLeft <= 10 && ch.timeLeft > 0) {
    el.classList.add('warning');
    playTick();
  }
  if (ch.timeLeft <= 0) {
    clearInterval(ch.timer);
    playAlarm();
    chroniclesEndTurn('timeout');
  }
}

function chroniclesCorrect() {
  playCorrect();
  ch.score++;
  ch.teams[ch.currentTeamIdx].score += 1;
  document.getElementById('ch-score').textContent = ch.score;
  const card = document.getElementById('ch-word-card');
  card.classList.remove('correct-flash');
  void card.offsetHeight;
  card.classList.add('correct-flash');
  confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 }, colors: ['#00ff88','#ffe600','#00c8ff'] });
  setTimeout(() => card.classList.remove('correct-flash'), 600);
  chroniclesNextWord();
}

function chroniclesSkip() {
  playClick();
  if (ch.word) ch.skipped.push(ch.word);
  chroniclesNextWord();
}

function chroniclesEndTurn(reason) {
  clearInterval(ch.timer);
  showEndTurnOverlay(reason);
}

function endChronicles() {
  showResults(ch.teams, 'chronicles');
}

// ============================================================
// TRIVIA DATABASE (Loaded from questions.json)
// ============================================================
let TRIVIA_DB = {};

async function loadTriviaDB() {
  try {
    const response = await fetch('questions.json');
    const data = await response.json();
    // Normalize keys to match app logic (lowercase, simplified)
    TRIVIA_DB = {
      sports: data["Sports"],
      politics: data["Politics & History"],
      music: data["Music & Art"],
      geography: data["Geography"],
      general: data["General Knowledge"]
    };
  } catch (err) {
    console.error("Failed to load trivia database:", err);
  }
}

// Initial load
loadTriviaDB();

// ============================================================
// TRIVIA GAME ENGINE
// ============================================================
let tr = {
  players: [], currentPlayerIdx: 0,
  totalRounds: 5, currentQ: 0, timeLeft: 30, timer: null,
  category: 'general', questions: [], score: 0,
  streak: 0, answered: false
};

function startTrivia() {
  const cfg = gameConfig.trivia;
  tr.players = cfg.players.map(p => ({ ...p, score: 0 }));
  tr.totalRounds = cfg.rounds;
  tr.timeEach = cfg.time;
  tr.category = cfg.category;
  tr.currentPlayerIdx = 0;

  // Ensure DB is loaded before starting
  if (!TRIVIA_DB[tr.category]) {
    loadTriviaDB().then(() => {
      if (TRIVIA_DB[tr.category]) {
        showScreen('trivia-game');
        showGenericGetReady({
          playerName: tr.players[0].name,
          meta: `${tr.totalRounds} questions • ${tr.timeEach}s each • ${tr.category.toUpperCase()}`,
          onStart: () => triviaStartPlayer()
        });
      } else {
        alert("Error: Trivia questions not loaded yet. Please try again in a moment.");
      }
    });
    return;
  }

  showScreen('trivia-game');
  showGenericGetReady({
    playerName: tr.players[0].name,
    meta: `${tr.totalRounds} questions • ${tr.timeEach}s each • ${tr.category.toUpperCase()}`,
    onStart: () => triviaStartPlayer()
  });
}

function triviaStartPlayer() {
  clearInterval(tr.timer);
  const qs = [...TRIVIA_DB[tr.category]].sort(() => Math.random() - 0.5);
  tr.questions = qs.slice(0, tr.totalRounds);
  tr.currentQ = 0;
  tr.score = 0;
  tr.streak = 0;
  // Initialize total time here
  tr.timeLeft = tr.timeEach;
  updateTriviaLiveScores();
  triviaShowQuestion();
}

function updateTriviaLiveScores() {
  const el = document.getElementById('tr-live-scores');
  el.innerHTML = tr.players.map((p, i) => `
    <div class="trivia-player-score" style="border-color:${TEAM_COLORS[i]}">
      ${p.name}: <span class="pts">${p.score}</span>
    </div>
  `).join('');
}

function triviaShowQuestion() {
  clearInterval(tr.timer);
  tr.answered = false;
  const p = tr.players[tr.currentPlayerIdx];
  const q = tr.questions[tr.currentQ];
  if (!q) { triviaEndPlayer(); return; }

  document.getElementById('tr-player-name').textContent = p.name;
  document.getElementById('tr-q-label').textContent = `Q ${tr.currentQ + 1}/${tr.totalRounds}`;
  document.getElementById('tr-category').textContent = tr.category.toUpperCase();
  document.getElementById('tr-question').textContent = q.q;
  document.getElementById('tr-next-btn').classList.remove('show');
  document.getElementById('tr-streak').textContent = tr.streak >= 2 ? `🔥 ${tr.streak} Streak!` : '';

  const pct = ((tr.currentQ) / tr.totalRounds) * 100;
  document.getElementById('tr-progress-bar').style.width = pct + '%';

  const opts = document.getElementById('tr-options');
  opts.innerHTML = '';
  const letters = ['A','B','C','D'];
  q.o.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span>${opt}`;
    btn.onclick = () => triviaAnswer(i, btn, q.a);
    opts.appendChild(btn);
  });

  document.getElementById('tr-timer').textContent = tr.timeLeft;
  document.getElementById('tr-timer').classList.remove('warning');
  tr.timer = setInterval(triviaTick, 1000);
}

function triviaTick() {
  tr.timeLeft--;
  const el = document.getElementById('tr-timer');
  el.textContent = tr.timeLeft;
  
  if (tr.timeLeft <= 5 && tr.timeLeft > 0) {
    el.classList.add('warning');
    if (typeof playTick === "function") playTick(); 
  }
  
  if (tr.timeLeft <= 0) {
    clearInterval(tr.timer);
    if (typeof playAlarm === "function") playAlarm(); 
    
    if (!tr.answered) {
      tr.answered = true;
      tr.streak = 0;
      document.getElementById('tr-streak').textContent = '⏰ Time Up!';
      
      const allBtns = document.getElementById('tr-options').children;
      Array.from(allBtns).forEach(b => b.disabled = true);
      
      const q = tr.questions[tr.currentQ];
      allBtns[q.a].classList.add('correct');
      
      // Auto-advance to the end of the player's turn
      setTimeout(triviaEndPlayer, 1500); 
    }
  }
}

function triviaAnswer(selected, btn, correct) {
  if (tr.answered) return;
  tr.answered = true;

  // Pause global timer during the transition so you dont lose time
  clearInterval(tr.timer);

  const allBtns = document.getElementById('tr-options').children;
  Array.from(allBtns).forEach(b => b.disabled = true);

  // Check if right or wrong
  if (selected === correct) {
    playCorrect();
    btn.classList.add('correct');
    tr.streak++;
    const pts = tr.streak >= 3 ? 3 : tr.streak >= 2 ? 2 : 1;
    tr.score += pts;
    tr.players[tr.currentPlayerIdx].score += pts;
    document.getElementById('tr-score').textContent = tr.score;
    document.getElementById('tr-streak').textContent = tr.streak >= 2 ? `🔥 ${tr.streak} Streak! +${pts} pts` : `✓ Correct! +${pts} pt`;
    updateTriviaLiveScores();
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.65 }, colors: ['#00ff88','#ffe600'] });
  } else {
    playWrong();
    btn.classList.add('wrong');
    allBtns[correct].classList.add('correct'); // reveal correct answer
    tr.streak = 0;
    document.getElementById('tr-streak').textContent = '✗ Wrong!';
  }
  // Automatically advance to the next question after a short delay
  setTimeout(triviaNext, 1000);
  document.getElementById('tr-next-btn').classList.add('show');
}

function triviaTimedOut() {
  tr.answered = true;
  tr.streak = 0;
  const allBtns = document.getElementById('tr-options').children;
  Array.from(allBtns).forEach(b => b.disabled = true);
  const q = tr.questions[tr.currentQ];
  allBtns[q.a].classList.add('correct');
  document.getElementById('tr-streak').textContent = '⏰ Time Out!';
  document.getElementById('tr-next-btn').classList.add('show');
}

function triviaNext() {
  playClick();
  tr.currentQ++;
  if (tr.currentQ < tr.totalRounds) {
    triviaShowQuestion();
  } else {
    triviaEndPlayer();
  }
}

function triviaEndPlayer() {
  clearInterval(tr.timer);
  const nextIdx = tr.currentPlayerIdx + 1;
  const playedPlayer = tr.players[tr.currentPlayerIdx];
  const gameOver = nextIdx >= tr.players.length;

  showGenericEndTurn({
    players: tr.players,
    playedPlayer: playedPlayer,
    playedIdx: tr.currentPlayerIdx,
    roundScore: tr.score,
    gameOver: gameOver,
    nextPlayerName: gameOver ? null : tr.players[nextIdx].name,
    nextMeta: gameOver ? null : `${tr.totalRounds} questions • ${tr.category.toUpperCase()}`,
    onNext: () => {
      tr.currentPlayerIdx = nextIdx;
      triviaStartPlayer();
    },
    onResults: () => showResults(tr.players, 'trivia')
  });
}

// ============================================================
// FLAG DATABASE
// ============================================================
const FLAGS_EASY = [
  { code:'ke', country:'Kenya',        opts:['Tanzania','Kenya','Uganda','Ethiopia'] },
  { code:'ng', country:'Nigeria',      opts:['Ghana','Nigeria','Senegal','Mali'] },
  { code:'za', country:'South Africa', opts:['Zimbabwe','Zambia','Botswana','South Africa'] },
  { code:'gh', country:'Ghana',        opts:['Ghana','Togo','Benin','Ivory Coast'] },
  { code:'et', country:'Ethiopia',     opts:['Ethiopia','Eritrea','Djibouti','Somalia'] },
  { code:'rw', country:'Rwanda',       opts:['Burundi','Rwanda','Uganda','Tanzania'] },
  { code:'ug', country:'Uganda',       opts:['Uganda','Kenya','Tanzania','Rwanda'] },
  { code:'tz', country:'Tanzania',     opts:['Tanzania','Mozambique','Malawi','Zambia'] },
  { code:'sn', country:'Senegal',      opts:['Senegal','Mali','Gambia','Guinea'] },
  { code:'ao', country:'Angola',       opts:['Angola','Congo','Zambia','Zimbabwe'] },
  { code:'sd', country:'Sudan',        opts:['Sudan','Chad','Niger','Libya'] },
  { code:'cm', country:'Cameroon',     opts:['Cameroon','Gabon','Congo','C. African Rep.'] },
  { code:'zw', country:'Zimbabwe',     opts:['Zimbabwe','Zambia','Malawi','Mozambique'] },
  { code:'mz', country:'Mozambique',   opts:['Mozambique','Tanzania','Zimbabwe','Madagascar'] },
  { code:'bf', country:'Burkina Faso', opts:['Mali','Burkina Faso','Niger','Senegal'] },
  { code:'mg', country:'Madagascar',   opts:['Madagascar','Mauritius','Comoros','Seychelles'] },
  { code:'cd', country:'DR Congo',     opts:['Congo','DR Congo','Gabon','Angola'] },
  { code:'ma', country:'Morocco',      opts:['Morocco','Algeria','Tunisia','Libya'] },
  { code:'tn', country:'Tunisia',      opts:['Tunisia','Morocco','Algeria','Egypt'] },
  { code:'dz', country:'Algeria',      opts:['Algeria','Morocco','Libya','Tunisia'] },
  { code:'eg', country:'Egypt',        opts:['Egypt','Syria','Iraq','Libya'] },
  { code:'ly', country:'Libya',        opts:['Libya','Algeria','Tunisia','Egypt'] },
  { code:'ci', country:'Ivory Coast',  opts:['Ivory Coast','Guinea','Mali','Ireland'] },
  { code:'zm', country:'Zambia',       opts:['Zambia','Zimbabwe','Malawi','Tanzania'] },
  { code:'mw', country:'Malawi',       opts:['Malawi','Zambia','Mozambique','Tanzania'] },
  { code:'us', country:'United States', opts:['Canada','United States','Mexico','United Kingdom'] },
  { code:'ca', country:'Canada',        opts:['United States','Canada','Australia','New Zealand'] },
  { code:'mx', country:'Mexico',        opts:['Spain','Mexico','Colombia','Argentina'] },
  { code:'br', country:'Brazil',        opts:['Portugal','Brazil','Argentina','Colombia'] },
  { code:'ar', country:'Argentina',     opts:['Chile','Uruguay','Argentina','Spain'] },
  { code:'cl', country:'Chile',         opts:['Peru','Argentina','Bolivia','Chile'] },
  { code:'co', country:'Colombia',      opts:['Venezuela','Ecuador','Colombia','Peru'] },
  { code:'pe', country:'Peru',          opts:['Chile','Bolivia','Peru','Ecuador'] },
  { code:'ve', country:'Venezuela',     opts:['Colombia','Venezuela','Guyana','Brazil'] },
  { code:'ec', country:'Ecuador',       opts:['Colombia','Peru','Ecuador','Chile'] },
  { code:'bo', country:'Bolivia',       opts:['Peru','Paraguay','Bolivia','Chile'] },
  { code:'py', country:'Paraguay',      opts:['Uruguay','Paraguay','Bolivia','Argentina'] },
  { code:'uy', country:'Uruguay',       opts:['Paraguay','Argentina','Uruguay','Chile'] },
  { code:'cu', country:'Cuba',          opts:['Haiti','Cuba','Jamaica','Bahamas'] },
  { code:'jm', country:'Jamaica',       opts:['Bahamas','Cuba','Jamaica','Barbados'] },
  { code:'ht', country:'Haiti',         opts:['Dominican Republic','Haiti','Cuba','Jamaica'] },
  { code:'do', country:'Dominican Rep', opts:['Haiti','Cuba','Puerto Rico','Dominican Rep'] },
  { code:'pa', country:'Panama',        opts:['Costa Rica','Colombia','Panama','Nicaragua'] },
  { code:'cr', country:'Costa Rica',    opts:['Panama','Nicaragua','Costa Rica','Honduras'] },
  { code:'hn', country:'Honduras',      opts:['Guatemala','El Salvador','Honduras','Nicaragua'] },
  { code:'gb', country:'United Kingdom',opts:['Ireland','United Kingdom','Australia','New Zealand'] },
  { code:'fr', country:'France',        opts:['Germany','Italy','Spain','France'] },
  { code:'de', country:'Germany',       opts:['Austria','Switzerland','Germany','Netherlands'] },
  { code:'it', country:'Italy',         opts:['Spain','Greece','Italy','France'] },
  { code:'es', country:'Spain',         opts:['Portugal','Italy','Spain','Mexico'] },
  { code:'pt', country:'Portugal',      opts:['Spain','Brazil','Portugal','Italy'] },
  { code:'ie', country:'Ireland',       opts:['United Kingdom','Ireland','Iceland','France'] },
  { code:'nl', country:'Netherlands',   opts:['Belgium','Germany','Netherlands','Denmark'] },
  { code:'be', country:'Belgium',       opts:['Netherlands','France','Belgium','Switzerland'] },
  { code:'ch', country:'Switzerland',   opts:['Austria','Germany','Switzerland','Sweden'] },
  { code:'at', country:'Austria',       opts:['Germany','Switzerland','Austria','Hungary'] },
  { code:'se', country:'Sweden',        opts:['Norway','Finland','Sweden','Denmark'] },
  { code:'no', country:'Norway',        opts:['Sweden','Denmark','Norway','Finland'] },
  { code:'dk', country:'Denmark',       opts:['Norway','Sweden','Netherlands','Denmark'] },
  { code:'fi', country:'Finland',       opts:['Sweden','Russia','Estonia','Finland'] },
  { code:'pl', country:'Poland',        opts:['Germany','Czechia','Poland','Ukraine'] },
  { code:'cz', country:'Czechia',       opts:['Slovakia','Austria','Poland','Czechia'] },
  { code:'hu', country:'Hungary',       opts:['Austria','Romania','Hungary','Slovakia'] },
  { code:'gr', country:'Greece',        opts:['Cyprus','Italy','Turkey','Greece'] },
  { code:'tr', country:'Turkey',        opts:['Greece','Syria','Turkey','Iran'] },
  { code:'ua', country:'Ukraine',       opts:['Russia','Belarus','Poland','Ukraine'] },
  { code:'ro', country:'Romania',       opts:['Bulgaria','Hungary','Moldova','Romania'] },
  { code:'bg', country:'Bulgaria',      opts:['Romania','Greece','Turkey','Bulgaria'] },
  { code:'rs', country:'Serbia',        opts:['Croatia','Bosnia','Serbia','Montenegro'] },
  { code:'hr', country:'Croatia',       opts:['Serbia','Slovenia','Croatia','Bosnia'] },
  { code:'ru', country:'Russia',        opts:['Ukraine','Belarus','Kazakhstan','Russia'] },
  { code:'cn', country:'China',         opts:['Japan','South Korea','China','Taiwan'] },
  { code:'jp', country:'Japan',         opts:['China','South Korea','Japan','Philippines'] },
  { code:'kr', country:'South Korea',   opts:['North Korea','Japan','South Korea','China'] },
  { code:'in', country:'India',         opts:['Pakistan','Bangladesh','Sri Lanka','India'] },
  { code:'pk', country:'Pakistan',      opts:['India','Afghanistan','Iran','Pakistan'] },
  { code:'bd', country:'Bangladesh',    opts:['India','Myanmar','Bangladesh','Nepal'] },
  { code:'lk', country:'Sri Lanka',     opts:['India','Maldives','Sri Lanka','Mauritius'] },
  { code:'np', country:'Nepal',         opts:['Bhutan','India','China','Nepal'] },
  { code:'id', country:'Indonesia',     opts:['Malaysia','Philippines','Indonesia','Thailand'] },
  { code:'my', country:'Malaysia',      opts:['Indonesia','Singapore','Thailand','Malaysia'] },
  { code:'th', country:'Thailand',      opts:['Vietnam','Cambodia','Thailand','Myanmar'] },
  { code:'vn', country:'Vietnam',       opts:['Thailand','Laos','Vietnam','Cambodia'] },
  { code:'ph', country:'Philippines',   opts:['Indonesia','Malaysia','Philippines','Taiwan'] },
  { code:'sg', country:'Singapore',     opts:['Malaysia','Brunei','Singapore','Hong Kong'] },
  { code:'au', country:'Australia',     opts:['New Zealand','United Kingdom','Australia','South Africa'] },
  { code:'nz', country:'New Zealand',   opts:['Australia','Ireland','United Kingdom','New Zealand'] },
  { code:'fj', country:'Fiji',          opts:['Samoa','Tonga','Vanuatu','Fiji'] },
  { code:'pg', country:'Papua New Guinea',opts:['Indonesia','Solomon Islands','Papua New Guinea','Fiji'] },
  { code:'ws', country:'Samoa',         opts:['Fiji','Tonga','Samoa','Vanuatu'] },
  { code:'ir', country:'Iran',          opts:['Iraq','Saudi Arabia','Afghanistan','Iran'] },
  { code:'iq', country:'Iraq',          opts:['Iran','Syria','Saudi Arabia','Iraq'] },
  { code:'sa', country:'Saudi Arabia',  opts:['UAE','Oman','Yemen','Saudi Arabia'] },
  { code:'ae', country:'UAE',           opts:['Saudi Arabia','Qatar','Oman','UAE'] },
  { code:'om', country:'Oman',          opts:['Yemen','UAE','Saudi Arabia','Oman'] },
  { code:'ye', country:'Yemen',         opts:['Oman','Saudi Arabia','Somalia','Yemen'] },
  { code:'qa', country:'Qatar',         opts:['Bahrain','Kuwait','UAE','Qatar'] },
  { code:'kw', country:'Kuwait',        opts:['Iraq','Saudi Arabia','Bahrain','Kuwait'] },
  { code:'jo', country:'Jordan',        opts:['Syria','Israel','Saudi Arabia','Jordan'] },
  { code:'il', country:'Israel',        opts:['Jordan','Lebanon','Syria','Israel'] },
  { code:'ml', country:'Mali',          opts:['Niger','Senegal','Mali','Burkina Faso'] },
  { code:'ne', country:'Niger',         opts:['Mali','Chad','Nigeria','Niger'] },
  { code:'td', country:'Chad',          opts:['Niger','Sudan','CAR','Chad'] },
  { code:'mr', country:'Mauritania',    opts:['Mali','Senegal','Western Sahara','Mauritania'] },
  { code:'gn', country:'Guinea',        opts:['Liberia','Sierra Leone','Senegal','Guinea'] },
  { code:'lr', country:'Liberia',       opts:['Sierra Leone','Ivory Coast','Guinea','Liberia'] },
  { code:'sl', country:'Sierra Leone',  opts:['Liberia','Guinea','Gambia','Sierra Leone'] },
  { code:'tg', country:'Togo',          opts:['Benin','Ghana','Burkina Faso','Togo'] },
  { code:'bj', country:'Benin',         opts:['Togo','Nigeria','Niger','Benin'] },
  { code:'ga', country:'Gabon',         opts:['Congo','Cameroon','Eq. Guinea','Gabon'] },
  { code:'cg', country:'Congo',         opts:['DR Congo','Gabon','Angola','Congo'] },
  { code:'bw', country:'Botswana',      opts:['Namibia','Zimbabwe','South Africa','Botswana'] },
  { code:'na', country:'Namibia',       opts:['Botswana','South Africa','Angola','Namibia'] },
  { code:'ls', country:'Lesotho',       opts:['Eswatini','South Africa','Botswana','Lesotho'] },
  { code:'sz', country:'Eswatini',      opts:['Lesotho','Mozambique','South Africa','Eswatini'] },
  { code:'bi', country:'Burundi',       opts:['Rwanda','Tanzania','DR Congo','Burundi'] },
  { code:'dj', country:'Djibouti',      opts:['Eritrea','Ethiopia','Somalia','Djibouti'] },
  { code:'er', country:'Eritrea',       opts:['Ethiopia','Sudan','Djibouti','Eritrea'] },
  { code:'so', country:'Somalia',       opts:['Ethiopia','Kenya','Djibouti','Somalia'] },
  { code:'gq', country:'Eq. Guinea',    opts:['Gabon','Cameroon','Sao Tome','Eq. Guinea'] },
  { code:'gw', country:'Guinea-Bissau', opts:['Guinea','Senegal','Gambia','Guinea-Bissau'] },
  { code:'gm', country:'Gambia',        opts:['Senegal','Guinea-Bissau','Mauritania','Gambia'] },
  { code:'cv', country:'Cape Verde',    opts:['Sao Tome','Canary Islands','Cape Verde','Madeira'] },
  { code:'km', country:'Comoros',       opts:['Madagascar','Mauritius','Seychelles','Comoros'] },
  { code:'sc', country:'Seychelles',    opts:['Mauritius','Maldives','Comoros','Seychelles'] }
];

const FLAGS_HARD = [
  { code:'bi', country:'Burundi',       opts:['Rwanda','Burundi','Uganda','C. African Rep.'] },
  { code:'km', country:'Comoros',       opts:['Comoros','Maldives','Mauritius','Seychelles'] },
  { code:'dj', country:'Djibouti',      opts:['Somalia','Eritrea','Djibouti','Ethiopia'] },
  { code:'gq', country:'Eq. Guinea',    opts:['Guinea','Cameroon','Eq. Guinea','Gabon'] },
  { code:'sl', country:'Sierra Leone',  opts:['Liberia','Ivory Coast','Sierra Leone','Guinea'] },
  { code:'bj', country:'Benin',         opts:['Togo','Benin','Ghana','Nigeria'] },
  { code:'gn', country:'Guinea',        opts:['Sierra Leone','Guinea','Mali','Senegal'] },
  { code:'cf', country:'C. African Rep.', opts:['Chad','C. African Rep.','Sudan','Cameroon'] },
  { code:'td', country:'Chad',          opts:['Chad','Niger','Sudan','C. African Rep.'] },
  { code:'mr', country:'Mauritania',    opts:['Morocco','Mauritania','Algeria','Senegal'] },
  { code:'ss', country:'South Sudan',   opts:['Sudan','Ethiopia','South Sudan','Kenya'] },
  { code:'so', country:'Somalia',       opts:['Somalia','Djibouti','Eritrea','Kenya'] },
  { code:'ls', country:'Lesotho',       opts:['Eswatini','Lesotho','Botswana','Namibia'] },
  { code:'sz', country:'Eswatini',      opts:['Lesotho','Eswatini','Botswana','Zimbabwe'] },
  { code:'gw', country:'Guinea-Bissau', opts:['Guinea','Guinea-Bissau','Senegal','Mali'] },
  { code:'sc', country:'Seychelles',    opts:['Seychelles','Comoros','Mauritius','Maldives'] },
  { code:'ki', country:'Kiribati',      opts:['Tuvalu','Palau','Kiribati','Marshall Islands'] },
  { code:'pw', country:'Palau',         opts:['Micronesia','Palau','Marshall Islands','Nauru'] },
  { code:'sm', country:'San Marino',    opts:['Monaco','San Marino','Liechtenstein','Andorra'] },
  { code:'ad', country:'Andorra',       opts:['Andorra','Monaco','Liechtenstein','Luxembourg'] },
  { code:'er', country:'Eritrea',       opts:['Ethiopia','Eritrea','Djibouti','Sudan'] },
  { code:'ga', country:'Gabon',         opts:['Gabon','Cameroon','Congo','Eq. Guinea'] },
  { code:'cg', country:'Congo',         opts:['DR Congo','Congo','Gabon','C. African Rep.'] },
  { code:'ml', country:'Mali',          opts:['Senegal','Mali','Guinea','Burkina Faso'] },
  { code:'ne', country:'Niger',         opts:['Nigeria','Niger','Chad','Mali'] },
  { code:'al', country:'Albania',          opts:['Albania', 'Kosovo', 'Montenegro', 'North Macedonia'] },
  { code:'ad', country:'Andorra',          opts:['San Marino', 'Monaco', 'Andorra', 'Liechtenstein'] },
  { code:'am', country:'Armenia',          opts:['Georgia', 'Armenia', 'Azerbaijan', 'Turkey'] },
  { code:'az', country:'Azerbaijan',       opts:['Armenia', 'Iran', 'Azerbaijan', 'Georgia'] },
  { code:'by', country:'Belarus',          opts:['Russia', 'Ukraine', 'Belarus', 'Lithuania'] },
  { code:'ba', country:'Bosnia & Herz.',   opts:['Croatia', 'Serbia', 'Bosnia & Herz.', 'Montenegro'] },
  { code:'cy', country:'Cyprus',           opts:['Greece', 'Turkey', 'Malta', 'Cyprus'] },
  { code:'ee', country:'Estonia',          opts:['Latvia', 'Estonia', 'Lithuania', 'Finland'] },
  { code:'ge', country:'Georgia',          opts:['Armenia', 'Azerbaijan', 'Georgia', 'Russia'] },
  { code:'is', country:'Iceland',          opts:['Greenland', 'Iceland', 'Norway', 'Faroe Islands'] },
  { code:'kz', country:'Kazakhstan',       opts:['Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Kazakhstan'] },
  { code:'lv', country:'Latvia',           opts:['Estonia', 'Latvia', 'Lithuania', 'Belarus'] },
  { code:'li', country:'Liechtenstein',    opts:['Switzerland', 'Austria', 'Liechtenstein', 'Luxembourg'] },
  { code:'lt', country:'Lithuania',        opts:['Latvia', 'Estonia', 'Lithuania', 'Poland'] },
  { code:'lu', country:'Luxembourg',       opts:['Belgium', 'Netherlands', 'Luxembourg', 'Germany'] },
  { code:'mt', country:'Malta',            opts:['Cyprus', 'Malta', 'Italy', 'Greece'] },
  { code:'md', country:'Moldova',          opts:['Romania', 'Ukraine', 'Moldova', 'Bulgaria'] },
  { code:'mc', country:'Monaco',           opts:['Andorra', 'San Marino', 'Vatican City', 'Monaco'] },
  { code:'me', country:'Montenegro',       opts:['Serbia', 'Montenegro', 'Albania', 'Croatia'] },
  { code:'mk', country:'North Macedonia',  opts:['Bulgaria', 'Greece', 'North Macedonia', 'Albania'] },
  { code:'sm', country:'San Marino',       opts:['Vatican City', 'Monaco', 'Andorra', 'San Marino'] },
  { code:'sk', country:'Slovakia',         opts:['Czechia', 'Slovakia', 'Hungary', 'Austria'] },
  { code:'si', country:'Slovenia',         opts:['Croatia', 'Slovenia', 'Slovakia', 'Austria'] },
  { code:'va', country:'Vatican City',     opts:['San Marino', 'Monaco', 'Vatican City', 'Italy'] },
  { code:'af', country:'Afghanistan',      opts:['Pakistan', 'Iran', 'Tajikistan', 'Afghanistan'] },
  { code:'bh', country:'Bahrain',          opts:['Qatar', 'Kuwait', 'Bahrain', 'Oman'] },
  { code:'bn', country:'Brunei',           opts:['Malaysia', 'Singapore', 'Indonesia', 'Brunei'] },
  { code:'kh', country:'Cambodia',         opts:['Vietnam', 'Laos', 'Cambodia', 'Thailand'] },
  { code:'kp', country:'North Korea',      opts:['South Korea', 'North Korea', 'China', 'Japan'] },
  { code:'kg', country:'Kyrgyzstan',       opts:['Tajikistan', 'Kyrgyzstan', 'Uzbekistan', 'Kazakhstan'] },
  { code:'la', country:'Laos',             opts:['Cambodia', 'Vietnam', 'Laos', 'Myanmar'] },
  { code:'lb', country:'Lebanon',          opts:['Syria', 'Jordan', 'Lebanon', 'Israel'] },
  { code:'mo', country:'Macau',            opts:['Hong Kong', 'Macau', 'Taiwan', 'Singapore'] },
  { code:'mv', country:'Maldives',         opts:['Seychelles', 'Mauritius', 'Maldives', 'Sri Lanka'] },
  { code:'mn', country:'Mongolia',         opts:['China', 'Russia', 'Mongolia', 'Kazakhstan'] },
  { code:'mm', country:'Myanmar',          opts:['Thailand', 'Laos', 'Myanmar', 'Bangladesh'] },
  { code:'sy', country:'Syria',            opts:['Lebanon', 'Iraq', 'Syria', 'Jordan'] },
  { code:'tw', country:'Taiwan',           opts:['China', 'Japan', 'South Korea', 'Taiwan'] },
  { code:'tj', country:'Tajikistan',       opts:['Uzbekistan', 'Kyrgyzstan', 'Tajikistan', 'Afghanistan'] },
  { code:'tm', country:'Turkmenistan',     opts:['Uzbekistan', 'Turkmenistan', 'Kazakhstan', 'Iran'] },
  { code:'uz', country:'Uzbekistan',       opts:['Kazakhstan', 'Tajikistan', 'Uzbekistan', 'Turkmenistan'] },
  { code:'tl', country:'Timor-Leste',      opts:['Indonesia', 'Papua New Guinea', 'Timor-Leste', 'Fiji'] },
  { code:'ag', country:'Antigua & Barbuda',opts:['Barbados', 'Bahamas', 'Antigua & Barbuda', 'Jamaica'] },
  { code:'bs', country:'Bahamas',          opts:['Jamaica', 'Bahamas', 'Barbados', 'Bermuda'] },
  { code:'bb', country:'Barbados',         opts:['Trinidad & Tobago', 'Jamaica', 'Barbados', 'Grenada'] },
  { code:'bz', country:'Belize',           opts:['Guatemala', 'Honduras', 'Belize', 'El Salvador'] },
  { code:'gd', country:'Grenada',          opts:['Barbados', 'St. Lucia', 'Grenada', 'Dominica'] },
  { code:'gt', country:'Guatemala',        opts:['El Salvador', 'Honduras', 'Nicaragua', 'Guatemala'] },
  { code:'gy', country:'Guyana',           opts:['Suriname', 'Venezuela', 'Guyana', 'Brazil'] },
  { code:'ni', country:'Nicaragua',        opts:['Honduras', 'Costa Rica', 'Nicaragua', 'Panama'] },
  { code:'kn', country:'St. Kitts & Nevis',opts:['Antigua', 'St. Kitts & Nevis', 'St. Lucia', 'Barbados'] },
  { code:'lc', country:'St. Lucia',        opts:['St. Vincent', 'Grenada', 'Barbados', 'St. Lucia'] },
  { code:'vc', country:'St. Vincent',      opts:['St. Lucia', 'Grenada', 'St. Vincent', 'Dominica'] },
  { code:'sr', country:'Suriname',         opts:['Guyana', 'French Guiana', 'Suriname', 'Brazil'] },
  { code:'tt', country:'Trinidad & Tobago',opts:['Jamaica', 'Barbados', 'Trinidad & Tobago', 'Bahamas'] },
  { code:'sv', country:'El Salvador',      opts:['Honduras', 'Guatemala', 'El Salvador', 'Nicaragua'] },
  { code:'ki', country:'Kiribati',         opts:['Tuvalu', 'Fiji', 'Kiribati', 'Vanuatu'] },
  { code:'mh', country:'Marshall Islands', opts:['Micronesia', 'Palau', 'Marshall Islands', 'Nauru'] },
  { code:'fm', country:'Micronesia',       opts:['Palau', 'Marshall Islands', 'Micronesia', 'Kiribati'] },
  { code:'nr', country:'Nauru',            opts:['Tuvalu', 'Nauru', 'Palau', 'Kiribati'] },
  { code:'pw', country:'Palau',            opts:['Micronesia', 'Palau', 'Nauru', 'Marshall Islands'] },
  { code:'sb', country:'Solomon Islands',  opts:['Vanuatu', 'Fiji', 'Solomon Islands', 'Papua New Guinea'] },
  { code:'to', country:'Tonga',            opts:['Samoa', 'Fiji', 'Tonga', 'Vanuatu'] },
  { code:'tv', country:'Tuvalu',           opts:['Kiribati', 'Nauru', 'Tuvalu', 'Tonga'] },
  { code:'vu', country:'Vanuatu',          opts:['Solomon Islands', 'Fiji', 'Vanuatu', 'New Caledonia'] },
  { code:'as', country:'American Samoa',   opts:['Samoa', 'American Samoa', 'Guam', 'Tonga'] },
  { code:'aw', country:'Aruba',            opts:['Curacao', 'Aruba', 'Bonaire', 'Bahamas'] },
  { code:'bm', country:'Bermuda',          opts:['Bahamas', 'Bermuda', 'Cayman Islands', 'Barbados'] },
  { code:'vg', country:'British Virgin Isl.',opts:['US Virgin Isl.', 'Bermuda', 'British Virgin Isl.', 'Cayman Islands'] },
  { code:'ky', country:'Cayman Islands',   opts:['Bahamas', 'Jamaica', 'Cayman Islands', 'Bermuda'] },
  { code:'cx', country:'Christmas Island', opts:['Cocos Islands', 'Norfolk Island', 'Christmas Island', 'Nauru'] },
  { code:'cc', country:'Cocos Islands',    opts:['Christmas Island', 'Cook Islands', 'Cocos Islands', 'Niue'] },
  { code:'ck', country:'Cook Islands',     opts:['Niue', 'Tokelau', 'Samoa', 'Cook Islands'] },
  { code:'fk', country:'Falkland Islands', opts:['South Georgia', 'St. Helena', 'Falkland Islands', 'Argentina'] },
  { code:'fo', country:'Faroe Islands',    opts:['Iceland', 'Greenland', 'Faroe Islands', 'Svalbard'] },
  { code:'gf', country:'French Guiana',    opts:['Suriname', 'Guyana', 'French Guiana', 'Brazil'] },
  { code:'pf', country:'French Polynesia', opts:['New Caledonia', 'Wallis & Futuna', 'French Polynesia', 'Fiji'] },
  { code:'gi', country:'Gibraltar',        opts:['Malta', 'Cyprus', 'Gibraltar', 'Andorra'] },
  { code:'gl', country:'Greenland',        opts:['Iceland', 'Faroe Islands', 'Greenland', 'Canada'] },
  { code:'gp', country:'Guadeloupe',       opts:['Martinique', 'Guadeloupe', 'St. Martin', 'Reunion'] },
  { code:'gu', country:'Guam',             opts:['Northern Mariana Isl.', 'Palau', 'Guam', 'American Samoa'] },
  { code:'gg', country:'Guernsey',         opts:['Jersey', 'Isle of Man', 'Guernsey', 'Gibraltar'] },
  { code:'hk', country:'Hong Kong',        opts:['Macau', 'Taiwan', 'Hong Kong', 'Singapore'] },
  { code:'im', country:'Isle of Man',      opts:['Jersey', 'Guernsey', 'Isle of Man', 'Ireland'] },
  { code:'je', country:'Jersey',           opts:['Guernsey', 'Isle of Man', 'Jersey', 'Gibraltar'] },
  { code:'mq', country:'Martinique',       opts:['Guadeloupe', 'St. Lucia', 'Martinique', 'Dominica'] },
  { code:'yt', country:'Mayotte',          opts:['Comoros', 'Reunion', 'Madagascar', 'Mayotte'] },
  { code:'ms', country:'Montserrat',       opts:['Anguilla', 'Montserrat', 'Antigua', 'St. Kitts'] },
  { code:'nc', country:'New Caledonia',    opts:['Vanuatu', 'Fiji', 'French Polynesia', 'New Caledonia'] },
  { code:'nu', country:'Niue',             opts:['Cook Islands', 'Tokelau', 'Niue', 'Samoa'] },
  { code:'nf', country:'Norfolk Island',   opts:['Christmas Island', 'Norfolk Island', 'Pitcairn', 'Nauru'] },
  { code:'mp', country:'Northern Mariana Isl.',opts:['Guam', 'Palau', 'Micronesia', 'Northern Mariana Isl.'] },
  { code:'pr', country:'Puerto Rico',      opts:['Dominican Rep', 'Cuba', 'Puerto Rico', 'Jamaica'] },
  { code:'re', country:'Réunion',          opts:['Mauritius', 'Seychelles', 'Mayotte', 'Réunion'] },
  { code:'bl', country:'St. Barthélemy',   opts:['St. Martin', 'Guadeloupe', 'St. Barthélemy', 'Martinique'] },
  { code:'sh', country:'St. Helena',       opts:['Ascension', 'Tristan da Cunha', 'St. Helena', 'Falkland Islands'] },
  { code:'mf', country:'St. Martin',       opts:['Sint Maarten', 'St. Barthélemy', 'Anguilla', 'St. Martin'] },
  { code:'pm', country:'St. Pierre & Miquelon',opts:['Greenland', 'Faroe Islands', 'Bermuda', 'St. Pierre & Miquelon'] },
  { code:'sx', country:'Sint Maarten',     opts:['St. Martin', 'Curacao', 'Aruba', 'Sint Maarten'] },
  { code:'tc', country:'Turks & Caicos',   opts:['Bahamas', 'Cayman Islands', 'Bermuda', 'Turks & Caicos'] },
];

// ============================================================
// FLAGS GAME ENGINE
// ============================================================
let fl = {
  players: [], currentPlayerIdx: 0,
  totalRounds: 5, currentQ: 0, timeLeft: 15, timer: null,
  level: 'easy', questions: [], score: 0, streak: 0
};

function startFlags() {
  const cfg = gameConfig.flags;
  fl.players = cfg.players.map(p => ({ ...p, score: 0 }));
  fl.totalRounds = cfg.rounds;
  fl.timeEach = cfg.time;
  fl.level = cfg.level;
  fl.currentPlayerIdx = 0;

  showScreen('flags-game');
  showGenericGetReady({
    playerName: fl.players[0].name,
    meta: `${fl.totalRounds} flags • ${fl.timeEach}s each • ${fl.level.toUpperCase()} mode`,
    onStart: () => flagsStartPlayer()
  });
}

function flagsStartPlayer() {
  const pool = fl.level === 'easy' ? FLAGS_EASY : FLAGS_HARD;
  fl.questions = [...pool].sort(() => Math.random() - 0.5).slice(0, fl.totalRounds);
  fl.currentQ = 0;
  fl.streak = 0;
  flagsShowQuestion();
}

function flagsShowQuestion() {
  const p = fl.players[fl.currentPlayerIdx];
  const q = fl.questions[fl.currentQ];
  
  if (!q) { 
    flagsEndPlayer(); 
    return; 
  }

  document.getElementById('fl-player-name').textContent = p.name;
  document.getElementById('fl-q-label').textContent = `Flag ${fl.currentQ + 1}/${fl.totalRounds}`;

  const flagImg = document.getElementById('fl-flag');
  flagImg.style.opacity = '0';
  flagImg.src = `https://flagcdn.com/w320/${q.code}.png`;
  flagImg.alt = 'Mystery Flag';
  flagImg.onload = () => { flagImg.style.opacity = '1'; };

  document.getElementById('fl-score').textContent = p.score;
  document.getElementById('fl-streak').textContent = fl.streak >= 2 ? `🔥 ${fl.streak} Streak!` : '';

  const opts = document.getElementById('fl-options');
  opts.innerHTML = '';
  
  const shuffledOpts = [...q.opts].sort(() => Math.random() - 0.5);
  shuffledOpts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'flag-opt-btn';
    btn.textContent = opt;
    btn.onclick = () => flagsAnswer(opt, btn, q.country);
    opts.appendChild(btn);
  });

  fl.timeLeft = fl.timeEach;
  const timerEl = document.getElementById('fl-timer');
  timerEl.textContent = fl.timeLeft;
  timerEl.classList.remove('warning');
  
  fl.timer = setInterval(flagsTick, 1000);
}

function flagsTick() {
  fl.timeLeft--;
  const el = document.getElementById('fl-timer');
  el.textContent = fl.timeLeft;
  
  if (fl.timeLeft <= 5 && fl.timeLeft > 0) {
    el.classList.add('warning');
    playTick();
  }
  
  if (fl.timeLeft <= 0) {
    playAlarm();
    flagsTimedOut();
  }
}

// HELPER: Disables buttons, clears timer, and optionally highlights the correct answer
function disableFlagOptions(highlightCorrect = null) {
  clearInterval(fl.timer);
  const allBtns = document.getElementById('fl-options').children;
  Array.from(allBtns).forEach(b => {
    b.disabled = true;
    if (b.textContent === highlightCorrect) b.classList.add('correct');
  });
}

function flagsAnswer(selected, btn, correct) {
  const p = fl.players[fl.currentPlayerIdx];

  if (selected === correct) {
    disableFlagOptions();
    playCorrect();
    btn.classList.add('correct');
    
    fl.streak++;
    const pts = fl.level === 'hard' ? (fl.streak >= 3 ? 4 : 2) : 1;
    p.score += pts;
    
    document.getElementById('fl-score').textContent = p.score;
    document.getElementById('fl-streak').textContent = fl.streak >= 2 ? `🔥 ${fl.streak} Streak! +${pts}` : `✓ +${pts}`;
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.55 }, colors: ['#ffe600','#00c8ff'] });
  } else {
    disableFlagOptions(correct);
    playWrong();
    btn.classList.add('wrong');
    fl.streak = 0;
    document.getElementById('fl-streak').textContent = `✗ It was ${correct}`;
  }
  
  setTimeout(() => { fl.currentQ++; flagsShowQuestion(); }, 1200);
}

function flagsTimedOut() {
  const q = fl.questions[fl.currentQ];
  disableFlagOptions(q.country);
  fl.streak = 0;
  document.getElementById('fl-streak').textContent = `⏰ It was ${q.country}`;
  
  setTimeout(() => { fl.currentQ++; flagsShowQuestion(); }, 1200);
}

function flagsEndPlayer() {
  const nextIdx = fl.currentPlayerIdx + 1;
  const playedPlayer = fl.players[fl.currentPlayerIdx];
  const gameOver = nextIdx >= fl.players.length;

  showGenericEndTurn({
    players: fl.players,
    playedPlayer: playedPlayer,
    playedIdx: fl.currentPlayerIdx,
    roundScore: playedPlayer.score, // Uses player score instead of redundant round score
    gameOver: gameOver,
    nextPlayerName: gameOver ? null : fl.players[nextIdx].name,
    nextMeta: gameOver ? null : `${fl.totalRounds} flags • ${fl.level.toUpperCase()} mode`,
    onNext: () => {
      fl.currentPlayerIdx = nextIdx;
      flagsStartPlayer();
    },
    onResults: () => showResults(fl.players, 'flags')
  });
}

// ============================================================
// GENERIC TRANSITION OVERLAYS (for Trivia & Flags)
// ============================================================
function showGenericGetReady({ playerName, meta, onStart }) {
  const overlay = document.getElementById('round-overlay');
  document.getElementById('overlay-getready-state').classList.remove('hidden');
  document.getElementById('overlay-endturn-state').classList.add('hidden');
  document.getElementById('overlay-handover-state').classList.add('hidden');

  document.getElementById('overlay-first-team-name').textContent = playerName;
  document.getElementById('overlay-first-meta').textContent = meta;

  overlay.classList.remove('hidden');
  const inner = overlay.querySelector('.overlay-inner');
  inner.style.animation = 'none';
  inner.offsetHeight;
  inner.style.animation = '';

  document.getElementById('overlay-start-btn').onclick = () => {
    overlay.classList.add('hidden');
    runCountdown(onStart);
  };
}

function showGenericEndTurn({ players, playedPlayer, playedIdx, roundScore, gameOver, nextPlayerName, nextMeta, onNext, onResults }) {
  const overlay = document.getElementById('round-overlay');
  document.getElementById('overlay-getready-state').classList.add('hidden');
  document.getElementById('overlay-endturn-state').classList.remove('hidden');
  document.getElementById('overlay-handover-state').classList.add('hidden');

  document.getElementById('overlay-end-icon').textContent = '✅';
  document.getElementById('overlay-end-badge').textContent = 'TURN COMPLETE!';

  document.getElementById('overlay-played-team').textContent = playedPlayer.name;
  document.getElementById('overlay-round-score').textContent = roundScore;
  document.getElementById('overlay-total-score').textContent = playedPlayer.score;

  const sbEl = document.getElementById('overlay-scoreboard');
  const sorted = [...players].sort((a, b) => b.score - a.score);
  sbEl.innerHTML = sorted.map((p, i) => `
    <div class="overlay-sb-row ${p === playedPlayer ? 'highlight' : ''}">
      <div class="overlay-sb-dot" style="background:${TEAM_COLORS[players.indexOf(p) % TEAM_COLORS.length]}"></div>
      <span class="overlay-sb-name">${i === 0 ? '🥇 ' : ''}${p.name}</span>
      <span class="overlay-sb-pts">${p.score}</span>
    </div>
  `).join('');

  const nextSection = document.getElementById('overlay-next-section');
  const finalSection = document.getElementById('overlay-final-section');

  if (gameOver) {
    nextSection.classList.add('hidden');
    finalSection.classList.remove('hidden');
    document.getElementById('overlay-results-btn').onclick = () => {
      overlay.classList.add('hidden');
      onResults();
    };
  } else {
    nextSection.classList.remove('hidden');
    finalSection.classList.add('hidden');
    document.getElementById('overlay-next-team-name').textContent = nextPlayerName;
    document.getElementById('overlay-next-meta').textContent = nextMeta;

    document.getElementById('overlay-next-start-btn').innerHTML = '📱 HAND OVER THE PHONE';
    document.getElementById('overlay-next-start-btn').onclick = () => {
      showHandover(nextPlayerName, () => {
        overlay.classList.add('hidden');
        runCountdown(onNext);
      });
    };
  }

  overlay.classList.remove('hidden');
  const inner = overlay.querySelector('.overlay-inner');
  inner.style.animation = 'none';
  inner.offsetHeight;
  inner.style.animation = '';
}

// ============================================================
// COUNTDOWN ANIMATION (3-2-1-GO!)
// ============================================================
function runCountdown(callback) {
  const overlay = document.getElementById('countdown-overlay');
  const numEl = document.getElementById('countdown-num');
  overlay.classList.remove('hidden');
  const steps = ['3', '2', '1', 'GO!'];
  let i = 0;
  function showNext() {
    if (i >= steps.length) {
      overlay.classList.add('hidden');
      callback();
      return;
    }
    numEl.textContent = steps[i];
    numEl.className = 'countdown-num' + (steps[i] === 'GO!' ? ' go' : '');
    numEl.style.animation = 'none';
    void numEl.offsetHeight;
    numEl.style.animation = '';
    if (sfxEnabled && steps[i] !== 'GO!') playTick();
    if (sfxEnabled && steps[i] === 'GO!') playCorrect();
    i++;
    setTimeout(showNext, 750);
  }
  showNext();
}

// ============================================================
// HANDOVER
// ============================================================
function showHandover(teamName, onReady) {
  const overlay = document.getElementById('round-overlay');
  document.getElementById('overlay-getready-state').classList.add('hidden');
  document.getElementById('overlay-endturn-state').classList.add('hidden');
  document.getElementById('overlay-handover-state').classList.remove('hidden');

  document.getElementById('overlay-handover-name').textContent = teamName;

  const inner = overlay.querySelector('.overlay-inner');
  inner.style.animation = 'none';
  void inner.offsetHeight;
  inner.style.animation = '';

  document.getElementById('overlay-handover-btn').onclick = () => {
    onReady();
  };
}

// ============================================================
// GAME HISTORY (localStorage)
// ============================================================
function saveGameHistory(players, game) {
  const history = JSON.parse(localStorage.getItem('ak_game_history') || '[]');
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const entry = {
    game: game,
    date: new Date().toISOString(),
    winner: sorted[0].name,
    winnerScore: sorted[0].score,
    players: sorted.map(p => ({ name: p.name, score: p.score }))
  };
  history.unshift(entry);
  if (history.length > 5) history.length = 5;
  localStorage.setItem('ak_game_history', JSON.stringify(history));
}

function renderGameHistory() {
  const history = JSON.parse(localStorage.getItem('ak_game_history') || '[]');
  const container = document.getElementById('history-list');
  const section = document.getElementById('history-section');
  if (!container || !section) return;

  if (history.length === 0) {
    container.innerHTML = '<div class="history-empty">No games played yet. Start a game!</div>';
    return;
  }

  const gameIcons = { chronicles: '💬', trivia: '🧠', flags: '🚩' };
  const gameNames = { chronicles: 'The Chronicles', trivia: 'Trivia Master', flags: 'Flag Contest' };

  container.innerHTML = history.map(h => {
    const d = new Date(h.date);
    const dateStr = d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    const allScores = h.players.map(p => `${p.name}: ${p.score}`).join(' • ');
    return `
      <div class="history-item">
        <div class="history-icon">${gameIcons[h.game] || '🎮'}</div>
        <div class="history-info">
          <div class="history-game-name">${gameNames[h.game] || h.game}</div>
          <div class="history-winner">🏆 ${h.winner} — ${allScores}</div>
          <div class="history-date">${dateStr}</div>
        </div>
        <div class="history-score">${h.winnerScore}</div>
      </div>
    `;
  }).join('');
}

// ============================================================
// RESULTS SCREEN
// ============================================================
let lastPlayers = [];
let lastGame = '';

function showResults(players, game) {
  lastPlayers = players;
  lastGame = game;
  const topScore = Math.max(...players.map(p => p.score));
  saveScore(topScore);
  saveGameHistory(players, game);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const container = document.getElementById('results-scores');
  container.innerHTML = '';
  sorted.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'score-item' + (i === 0 ? ' winner' : '');
    const medals = ['🥇','🥈','🥉'];
    div.innerHTML = `
      <span class="score-rank">${medals[i] || (i+1)}</span>
      <span class="score-name">${p.name}</span>
      <span class="score-pts">${p.score}</span>
    `;
    container.appendChild(div);
    setTimeout(() => div.style.animation = 'modalPop 0.3s ease', i * 100);
  });
  if (sorted[0] && sorted[0].score > 0) {
    setTimeout(() => confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 } }), 300);
  }
  showScreen('results');
}

function playAgain() {
  goToSetup(lastGame);
}

// ============================================================
// PARTICLES
// ============================================================
function createParticles() {
  const colors = ['#00ff88','#ffe600','#ff2244','#00c8ff','#ff8c00'];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 2;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}vw;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${Math.random() * 15 + 10}s;
      animation-delay: ${Math.random() * 10}s;
      z-index: 0;
    `;
    document.body.appendChild(p);
  }
}

createParticles();
renderProfilePane();
renderGameHistory();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}