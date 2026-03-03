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
// TRIVIA DATABASE
// ============================================================
const TRIVIA_DB = {
  sports: [
    { q:"Who is known as the GOAT of marathon running?", o:["David Rudisha","Eliud Kipchoge","Peter Tergat","Wilson Kipsang"], a:1 },
    { q:"Harambee Stars home ground is?", o:["City Stadium","Kasarani","Nyayo","Bukhungu"], a:1 },
    { q:"Which Kenyan was the first to break the 2-hour marathon barrier unofficially?", o:["Kipsang","Rudisha","Kipchoge","Cheruiyot"], a:2 },
    { q:"Ferdinand Omanyala is Kenya's fastest man. What is his event?", o:["200m","100m","400m","110m Hurdles"], a:1 },
    { q:"In what year did Kenya win the Rugby Sevens at the Nairobi leg?", o:["2015","2017","2016","2018"], a:1 },
    { q:"Which Kenyan athlete is famous for the 800m world record?", o:["Kipchoge","Omanyala","Rudisha","Kiptoo"], a:2 },
    { q:"Agnes Tirop was a Kenyan athlete known for which event?", o:["5000m","Marathon","Javelin","800m"], a:0 },
    { q:"What is Kenya's national football team called?", o:["Simba","Harambee Stars","Taifa Stars","Ingwe"], a:1 },
    { q:"Which county is known as the home of Kenyan runners?", o:["Nandi","Nairobi","Mombasa","Kisumu"], a:0 },
    { q:"How many Olympic gold medals did Kenya win at 2020 Tokyo Olympics?", o:["4","6","10","8"], a:0 },
    { q:"Which Kenyan football club is famously known as K'Ogalo?", o:["AFC Leopards","Gor Mahia","Tusker FC","Sofapaka"], a:1 },
    { q:"Who won Kenya's first ever Olympic gold medal in 1968?", o:["Kipchoge Keino","Naftali Temu","Paul Tergat","Samuel Wanjiru"], a:1 },
    { q:"Julius Yego is a world champion in which unusual event for a Kenyan?", o:["Shot put","High jump","Javelin","Discus"], a:2 },
    { q:"Which Kenyan city is known globally as the 'City of Champions'?", o:["Nairobi","Nakuru","Iten","Eldoret"], a:3 },
    { q:"Who was the first Kenyan woman to win an Olympic gold medal?", o:["Pamela Jelimo","Catherine Ndereba","Tegla Loroupe","Vivian Cheruiyot"], a:0 }
  ],
  politics: [
    { q:"Who was the 3rd President of Kenya?", o:["Moi","Kibaki","Uhuru","Ruto"], a:1 },
    { q:"What is the nickname of Deputy President Rigathi Gachagua?", o:["Baba","Zakayo","Riggy G","Hustler"], a:2 },
    { q:"In what year did Kenya gain independence?", o:["1960","1962","1963","1965"], a:2 },
    { q:"Who was Kenya's first President?", o:["Tom Mboya","Daniel Moi","Oginga Odinga","Jomo Kenyatta"], a:3 },
    { q:"Who did William Ruto defeat in the 2022 presidential election?", o:["Musyoka","Mudavadi","Raila Odinga","Karua"], a:2 },
    { q:"What does BBI stand for in Kenyan politics?", o:["Board of Budget Integration","Building Bridges Initiative","Bill of Business Interests","Bold Budget Implementation"], a:1 },
    { q:"The Kenyan constitution was promulgated in which year?", o:["2008","2010","2012","2013"], a:1 },
    { q:"How many counties does Kenya have?", o:["42","47","52","57"], a:1 },
    { q:"Who was Kenya's first female Chief Justice?", o:["Martha Koome","Philomena Mwilu","Joyce Aluoch","Lydiah Achode"], a:0 },
    { q:"What party did Raila Odinga found?", o:["ODM","PNU","NASA","Wiper"], a:0 },
    { q:"Who served as Kenya's very first Vice President?", o:["Joseph Murumbi","Jaramogi Oginga Odinga","Daniel arap Moi","Mwai Kibaki"], a:1 },
    { q:"Which political party led Kenya to independence in 1963?", o:["KADU","ODM","Jubilee","KANU"], a:3 },
    { q:"Who was the second Prime Minister of Kenya?", o:["Jomo Kenyatta","Raila Odinga","Uhuru Kenyatta","Musalia Mudavadi"], a:1 },
    { q:"What was the name of the coalition that brought Mwai Kibaki to power in 2002?", o:["CORD","NASA","NARC","Jubilee"], a:2 },
    { q:"Which Kenyan county is designated as County Number 001?", o:["Nairobi","Mombasa","Kisumu","Nakuru"], a:1 }
  ],
  music: [
    { q:"Who sang 'Kaveve Kazoze'?", o:["Ngesh","Stevo Simple Boy","Mejja","Timmy TDat"], a:1 },
    { q:"Sauti Sol's breakthrough album was called?", o:["Midnight Train","Afrikan Sauce","Mwanzo","Reborn"], a:0 },
    { q:"Khaligraph Jones' real name is?", o:["Brian Ouko","George Njoroge","Paul Kasoa","Alex Otieno"], a:0 },
    { q:"Which Kenyan artist is known as 'The OG'?", o:["Nyashinski","Octopizzo","Khaligraph","Mejja"], a:2 },
    { q:"Gengetone is a music genre that originated in which city?", o:["Mombasa","Kisumu","Nairobi","Eldoret"], a:2 },
    { q:"Who is the lead singer of Sauti Sol?", o:["Savara","Bien","Willis","Polycarp"], a:1 },
    { q:"'Whole Lotta Money' is a hit by which Kenyan rapper?", o:["Trio Mio","Nelly the Goon","Femi One","Wakadinali"], a:0 },
    { q:"Which Kenyan musician's real name is Kevin Kioko?", o:["Mejja","Bahati","Stivo Simple Boy","Nviiri"], a:1 },
    { q:"Alikiba is a musician from which East African country?", o:["Kenya","Tanzania","Uganda","Rwanda"], a:1 },
    { q:"Which song made Nameless famous in Kenya?", o:["Megarider","Sunshine","Ninanzia","Maanake"], a:0 },
    { q:"What is the real name of the legendary artist Nyashinski?", o:["Nyamari Ongegu","David Mathenge","Jua Cali","Nameless"], a:0 },
    { q:"Which late Kenyan music legend sang the hit 'Mos Mos'?", o:["E-Sir","K-Rupt","Wiki Mosh","Mighty King Kong"], a:0 },
    { q:"Which Kenyan artist won an MTV Africa Music Award for Best Female in 2021?", o:["Nadia Mukami","Victoria Kimani","Nikita Kering","Femi One"], a:2 },
    { q:"The hit song 'Kwangwaru' features Harmonize and which other major East African artist?", o:["Diamond Platnumz","Alikiba","Rayvanny","Sauti Sol"], a:0 },
    { q:"Which Nairobi estate is widely considered the birthplace of the Sheng language?", o:["Karen","South C","Eastleigh","Kaloleni"], a:3 }
  ],
  geography: [
    { q:"What is the highest mountain in Kenya?", o:["Mt Elgon","Mt Kenya","Mt Kilimanjaro","Mt Longonot"], a:1 },
    { q:"Which is the largest county in Kenya by area?", o:["Nairobi","Mandera","Turkana","Marsabit"], a:2 },
    { q:"Lake Victoria borders Kenya, Uganda and which other country?", o:["Tanzania","Rwanda","Burundi","DRC"], a:0 },
    { q:"What is the capital city of Mombasa County?", o:["Malindi","Kilifi","Mombasa City","Diani"], a:2 },
    { q:"The Great Rift Valley passes through how many Kenyan counties?", o:["5","8","12","16"], a:2 },
    { q:"Which river is the longest in Kenya?", o:["Athi","Tana","Galana","Ewaso Ng'iro"], a:1 },
    { q:"Amboseli National Park is in which county?", o:["Narok","Kajiado","Taita Taveta","Kwale"], a:1 },
    { q:"What is the name of Kenya's main international airport?", o:["JKIA","Wilson Airport","Eldoret Airport","Kisumu Airport"], a:0 },
    { q:"Which county is home to the Maasai Mara?", o:["Kajiado","Narok","Laikipia","Samburu"], a:1 },
    { q:"How many countries does Kenya border?", o:["4","5","6","7"], a:1 },
    { q:"Which Kenyan town is famous for being located exactly on the Equator?", o:["Nakuru","Nanyuki","Naivasha","Nyeri"], a:1 },
    { q:"Lake Nakuru is world-famous for huge flocks of which bird?", o:["Pelicans","Flamingos","Cranes","Fish Eagles"], a:1 },
    { q:"What is the name of the large desert located in northern Kenya?", o:["Sahara","Kalahari","Chalbi","Namib"], a:2 },
    { q:"Which of these is the second highest peak on Mount Kenya?", o:["Batian","Lenana","Nelion","Kibo"], a:2 },
    { q:"The Tana River empties its waters into which ocean?", o:["Atlantic Ocean","Indian Ocean","Pacific Ocean","Southern Ocean"], a:1 }
  ],
  general: [
    { q:"What does M-Pesa stand for?", o:["Mobile Payment","Mobile Pesa","Mobile Money Transfer","Mobile Pepsi"], a:0 },
    { q:"M-Pesa belongs to which company?", o:["Airtel","Safaricom","Telkom","Equity Bank"], a:1 },
    { q:"What does SGR stand for?", o:["Super Good Rail","Standard Gauge Railway","Steam Gauge Railway","State General Railway"], a:1 },
    { q:"What is the Kenyan currency?", o:["Rand","Shilling","Pound","Franc"], a:1 },
    { q:"What animal appears on the Kenyan coat of arms?", o:["Lion","Elephant","Zebra","Buffalo"], a:0 },
    { q:"Kenya's motto 'Harambee' means?", o:["Unity is strength","Let us pull together","Forward together","We shall overcome"], a:1 },
    { q:"What year was Safaricom founded?", o:["1997","2000","1998","2002"], a:2 },
    { q:"Which Kenyan has won the Nobel Peace Prize?", o:["Raila Odinga","Wangari Maathai","Kalonzo Musyoka","Martha Karua"], a:1 },
    { q:"What is the national language of Kenya alongside Swahili?", o:["Kikuyu","Luo","Kamba","English"], a:3 },
    { q:"Kibera is the largest urban slum in which city?", o:["Mombasa","Kisumu","Nairobi","Eldoret"], a:2 },
    { q:"What year did the famous 'Tsavo Man-Eaters' halt the construction of the railway?", o:["1898","1901","1885","1914"], a:0 },
    { q:"What is the Swahili word for 'lion', which also doubles as a popular brand?", o:["Chui","Ndovu","Simba","Twiga"], a:2 },
    { q:"Which Kenyan staple dish consists of a mix of mashed maize and beans?", o:["Ugali","Githeri","Pilau","Mukimo"], a:1 },
    { q:"What is the name of the currency used in Kenya before the Shilling was introduced in 1966?", o:["Rupee","East African Florin","Pound","East African Shilling"], a:3 },
    { q:"Which internationally famous coffee chain sources heavily from Kenya but took years to open a local branch?", o:["Costa Coffee","Dunkin","Starbucks","Tim Hortons"], a:2 },
    { q:"What is the largest organ of the human body?", o:["Skin", "Heart", "large Intestine", "Liver"], a:0 },
    { q:"Which Kenyan bank was the first to introduce ATMs?", o: ["Equity","Barclays","KCB","Standard Chartered"], a: 3 },
    { q:"What does NHIF stand for?", o: ["National Health Insurance Fund","National Hospital Investment Fund","National Health Initiative Fund","None"], a: 0 },
  ]
};

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

  tr.timeLeft = tr.timeEach;
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
    playTick();
  }
  if (tr.timeLeft <= 0) {
    clearInterval(tr.timer);
    playAlarm();
    if (!tr.answered) triviaTimedOut();
  }
}

function triviaAnswer(selected, btn, correct) {
  if (tr.answered) return;
  tr.answered = true;
  clearInterval(tr.timer);
  const allBtns = document.getElementById('tr-options').children;
  Array.from(allBtns).forEach(b => b.disabled = true);

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
    allBtns[correct].classList.add('correct');
    tr.streak = 0;
    document.getElementById('tr-streak').textContent = '✗ Wrong!';
  }
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
  clearInterval(fl.timer);
  const pool = fl.level === 'easy' ? FLAGS_EASY : FLAGS_HARD;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  fl.questions = shuffled.slice(0, fl.totalRounds);
  fl.currentQ = 0;
  fl.score = 0;
  fl.streak = 0;
  flagsShowQuestion();
}

function flagsShowQuestion() {
  clearInterval(fl.timer);
  const p = fl.players[fl.currentPlayerIdx];
  const q = fl.questions[fl.currentQ];
  if (!q) { flagsEndPlayer(); return; }

  document.getElementById('fl-player-name').textContent = p.name;
  document.getElementById('fl-q-label').textContent = `Flag ${fl.currentQ + 1}/${fl.totalRounds}`;

  const flagImg = document.getElementById('fl-flag');
  flagImg.style.opacity = '0';
  flagImg.src = `https://flagcdn.com/w320/${q.code}.png`;
  flagImg.alt = 'Mystery Flag';
  flagImg.onload = () => { flagImg.style.opacity = '1'; };

  document.getElementById('fl-score').textContent = fl.score;
  document.getElementById('fl-streak').textContent = fl.streak >= 2 ? `🔥 ${fl.streak} Streak!` : '';

  const opts = document.getElementById('fl-options');
  opts.innerHTML = '';
  // FIX: removed unused allOpts/shuffledOpts params from onclick — function reads from DOM
  const shuffledOpts = [...q.opts].sort(() => Math.random() - 0.5);
  shuffledOpts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'flag-opt-btn';
    btn.textContent = opt;
    btn.onclick = () => flagsAnswer(opt, btn, q.country);
    opts.appendChild(btn);
  });

  fl.timeLeft = fl.timeEach;
  document.getElementById('fl-timer').textContent = fl.timeLeft;
  document.getElementById('fl-timer').classList.remove('warning');
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
    clearInterval(fl.timer);
    playAlarm();
    flagsTimedOut();
  }
}

// FIX: Removed unused `allOpts` and `shuffled` parameters from signature.
function flagsAnswer(selected, btn, correct) {
  clearInterval(fl.timer);
  const allBtns = document.getElementById('fl-options').children;
  Array.from(allBtns).forEach(b => b.disabled = true);

  if (selected === correct) {
    playCorrect();
    btn.classList.add('correct');
    fl.streak++;
    const pts = fl.level === 'hard' ? (fl.streak >= 3 ? 4 : 2) : 1;
    fl.score += pts;
    fl.players[fl.currentPlayerIdx].score += pts;
    document.getElementById('fl-score').textContent = fl.score;
    document.getElementById('fl-streak').textContent = fl.streak >= 2 ? `🔥 ${fl.streak} Streak! +${pts}` : `✓ +${pts}`;
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.55 }, colors: ['#ffe600','#00c8ff'] });
  } else {
    playWrong();
    btn.classList.add('wrong');
    fl.streak = 0;
    Array.from(allBtns).forEach(b => { if (b.textContent === correct) b.classList.add('correct'); });
    document.getElementById('fl-streak').textContent = `✗ It was ${correct}`;
  }
  setTimeout(() => { fl.currentQ++; flagsShowQuestion(); }, 1200);
}

function flagsTimedOut() {
  const q = fl.questions[fl.currentQ];
  fl.streak = 0;
  const allBtns = document.getElementById('fl-options').children;
  Array.from(allBtns).forEach(b => {
    b.disabled = true;
    if (b.textContent === q.country) b.classList.add('correct');
  });
  document.getElementById('fl-streak').textContent = `⏰ It was ${q.country}`;
  setTimeout(() => { fl.currentQ++; flagsShowQuestion(); }, 1200);
}

function flagsEndPlayer() {
  clearInterval(fl.timer);
  const nextIdx = fl.currentPlayerIdx + 1;
  const playedPlayer = fl.players[fl.currentPlayerIdx];
  const gameOver = nextIdx >= fl.players.length;

  showGenericEndTurn({
    players: fl.players,
    playedPlayer: playedPlayer,
    playedIdx: fl.currentPlayerIdx,
    roundScore: fl.score,
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