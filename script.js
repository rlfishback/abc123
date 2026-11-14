// ABC 123: letter and number recognition for little kids.
// Two modes: "Look" (tap a tile to see and hear it) and "Find" (hear one, tap the match).
const LETTERS = [
  ["A","apple","🍎"],["B","ball","⚽"],["C","cat","🐱"],["D","dog","🐶"],["E","egg","🥚"],
  ["F","fish","🐟"],["G","goat","🐐"],["H","hat","🎩"],["I","igloo","🛖"],["J","juice","🧃"],
  ["K","kite","🪁"],["L","lion","🦁"],["M","moon","🌙"],["N","nest","🪺"],["O","octopus","🐙"],
  ["P","pig","🐷"],["Q","queen","👑"],["R","rainbow","🌈"],["S","sun","☀️"],["T","tree","🌳"],
  ["U","umbrella","☂️"],["V","van","🚐"],["W","whale","🐳"],["X","fox","🦊"],["Y","yo-yo","🪀"],["Z","zebra","🦓"],
];
const NUM_WORDS = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
const NUM_ICON = "⭐";
const COLORS = ["--c1","--c2","--c3","--c4","--c5","--c6"];

// Gentle anti-guessing in Find mode (timings in ms).
const PAUSE_BASE = 1500, PAUSE_STEP = 500, PAUSE_CAP = 3000;
const RAPID_WINDOW = 2000, RAPID_TAPS = 3;
const MIN_CHOICES = 3, MAX_CHOICES = 4;
const SHRINK_AFTER = 2, RESTORE_AFTER = 2; // struggling rounds / first-try wins

const state = {
  mode: "explore", set: "letters", lower: false, idx: 0, target: null,
  stars: 0, misses: 0, choiceCount: MAX_CHOICES, struggle: 0, firstTries: 0,
  lockId: 0, locked: false, listenAgain: false, won: false, tapTimes: [],
};
const $ = (id) => document.getElementById(id);

function items() {
  if (state.set === "letters") {
    return LETTERS.map(([ch, word, pic]) => ({
      ch: state.lower ? ch.toLowerCase() : ch, name: ch, word, pic,
      say: ch === "X" ? `${ch}. ${ch} is in ${word}` : `${ch}. ${ch} is for ${word}`,
      key: `card-${ch.toLowerCase()}`, nameKey: `letter-${ch.toLowerCase()}`, findKey: `find-letter-${ch.toLowerCase()}`,
    }));
  }
  return NUM_WORDS.map((w, n) => ({
    ch: String(n), name: w, word: w, pic: n === 0 ? "🫙" : (n <= 10 ? NUM_ICON.repeat(n) : ""),
    // 11–20: a full ten-frame plus a second frame with the leftover ones (empty cells included).
    frames: n > 10 ? [10, n - 10] : null, say: `${w}`,
    key: `num-${n}`, nameKey: `num-${n}`, findKey: `find-number-${n}`,
  }));
}
const color = (i) => `var(${COLORS[i % COLORS.length]})`;

// --- Speech: pre-recorded Kokoro clips in audio/, played in sequence ---------
// Each item is [clipKey, fallbackText]; speechSynthesis is used only if a clip fails.
let queue = [], cur = null, token = 0;
const cache = {};
function clip(key) { return cache[key] || (cache[key] = Object.assign(new Audio(`audio/${key}.mp3`), { preload: "auto" })); }
function fallback(text) {
  if (!("speechSynthesis" in window)) return Promise.resolve();
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.85; u.pitch = 1.15;
    u.onend = u.onerror = res; speechSynthesis.speak(u);
  });
}
let cancelPlay = null;
function stopAll() {
  token++; queue = [];
  if (cancelPlay) { cancelPlay(); cancelPlay = null; }
  if (cur) { cur.pause(); cur = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
function playOne([key, text], my) {
  return new Promise(res => {
    const a = clip(key); cur = a;
    let done = false, timer = 0;
    const fin = (ok) => { if (done) return; done = true; a.onended = a.onerror = null;
      clearTimeout(timer); if (cancelPlay === finCancel) cancelPlay = null;
      if (!ok && my === token) fallback(text).then(res); else res(); };
    const finCancel = () => fin(true);
    cancelPlay = finCancel;
    a.onended = () => fin(true); a.onerror = () => fin(false);
    try { a.currentTime = 0; } catch (e) {}
    // Duration cap so a missed 'ended' event can't leave Find mode locked.
    const cap = (Number.isFinite(a.duration) && a.duration > 0 ? a.duration * 1000 : 5000) + 250;
    timer = setTimeout(() => fin(true), cap);
    const p = a.play(); if (p && p.catch) p.catch(() => fin(false));
  });
}
async function play(...parts) {
  stopAll(); const my = token; queue = parts;
  for (const part of queue) { if (my !== token) return; await playOne(part, my); }
}
function preload(keys) { keys.forEach(clip); }

// --- Look mode ------------------------------------------------------------------
function renderGrid() {
  const g = $("grid"); g.innerHTML = "";
  g.classList.toggle("nums", state.set === "numbers");
  items().forEach((it, i) => {
    const b = document.createElement("button");
    b.className = "tile"; b.textContent = it.ch; b.style.background = color(i);
    b.setAttribute("aria-label", it.name);
    b.onclick = () => openCard(i);
    g.appendChild(b);
  });
}
// For 11–20, draw two 2×5 ten-frames (a full ten, then the extra ones).
function showPic(it) {
  const el = $("cardPic");
  el.replaceChildren();
  el.classList.toggle("frames", !!it.frames);
  if (!it.frames) { el.textContent = it.pic; return; }
  it.frames.forEach((filled) => {
    const frame = document.createElement("div");
    frame.className = "ten-frame";
    frame.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 10; i++) {
      const cell = document.createElement("span");
      cell.className = "cell" + (i < filled ? " filled" : "");
      if (i < filled) cell.textContent = NUM_ICON;
      frame.appendChild(cell);
    }
    el.appendChild(frame);
  });
}
function openCard(i) {
  const list = items(); state.idx = (i + list.length) % list.length;
  const it = list[state.idx];
  $("cardChar").textContent = it.ch; $("cardChar").style.color = color(state.idx);
  showPic(it); $("cardWord").textContent = it.word;
  $("card").classList.remove("hidden");
  play([it.key, it.say]);
  const l = items(); preload([l[(state.idx + 1) % l.length].key]);
}
$("closeBtn").onclick = () => $("card").classList.add("hidden");
$("card").onclick = (e) => { if (e.target.id === "card") $("card").classList.add("hidden"); };
$("prevBtn").onclick = () => openCard(state.idx - 1);
$("nextBtn").onclick = () => openCard(state.idx + 1);
$("sayBtn").onclick = () => { const it = items()[state.idx]; play([it.key, it.say]); };

// Swipe left/right on the card
let tx = null;
$("card").addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, { passive: true });
$("card").addEventListener("touchend", e => {
  if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; tx = null;
  if (Math.abs(dx) > 60) openCard(state.idx + (dx < 0 ? 1 : -1));
});

// --- Find mode --------------------------------------------------------------------
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function askText(it) { return state.set === "letters" ? `Find the letter ${it.name}` : `Find the number ${it.name}`; }
function promptPhrase() { return state.set === "letters" ? "Find the letter" : "Find the number"; }
function pauseMs() { return Math.min(PAUSE_CAP, PAUSE_BASE + PAUSE_STEP * Math.max(0, state.misses - 1)); }
function renderStars() {
  const el = $("stars");
  el.textContent = `⭐ ${state.stars}`;
  el.setAttribute("aria-label", state.stars === 1 ? "1 star" : `${state.stars} stars`);
}
function setLocked(on) {
  state.locked = on;
  $("choices").classList.toggle("locked", on);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function lockFor(ms, parts, lockId) {
  setLocked(true);
  const until = Date.now() + ms;
  if (parts && parts.length) await play(...parts);
  const wait = until - Date.now();
  if (wait > 0) await sleep(wait);
  if (lockId === state.lockId && state.mode === "find" && !state.won) setLocked(false);
}
function recordTap() {
  const now = Date.now();
  state.tapTimes = state.tapTimes.filter(t => now - t < RAPID_WINDOW);
  state.tapTimes.push(now);
  return state.tapTimes.length >= RAPID_TAPS;
}
function fadeWrong() {
  const open = [...$("choices").querySelectorAll(".choice:not(.faded)")];
  const wrong = open.filter(b => +b.dataset.i !== state.target);
  if (!wrong.length) return;
  const b = wrong[Math.floor(Math.random() * wrong.length)];
  b.classList.add("faded");
  b.tabIndex = -1;
  b.setAttribute("aria-hidden", "true");
}
function pulseCorrect() {
  const b = $("choices").querySelector(`.choice[data-i="${state.target}"]`);
  if (b) b.classList.add("hint");
}
function applyHints() {
  if (state.misses === 2) fadeWrong();
  if (state.misses >= 3) {
    fadeWrong();
    pulseCorrect();
  }
}
function promptParts() {
  const it = items()[state.target];
  return [[it.findKey, askText(it)]];
}
function startMissPause(rapid) {
  state.listenAgain = !!rapid;
  const id = ++state.lockId;
  const parts = rapid ? [["lets-listen-again", "Let's listen again."], ...promptParts()] : promptParts();
  lockFor(pauseMs(), parts, id);
}
function listenAgain() {
  if (state.listenAgain || state.won || state.target === null) return;
  state.listenAgain = true;
  const id = ++state.lockId;
  lockFor(Math.max(pauseMs(), PAUSE_BASE), [["lets-listen-again", "Let's listen again."], ...promptParts()], id);
}
function updateAdaptive(tries) {
  if (tries === 1) {
    state.firstTries++;
    state.struggle = 0;
    if (state.firstTries >= RESTORE_AFTER) state.choiceCount = MAX_CHOICES;
  } else {
    state.firstTries = 0;
    state.struggle++;
    if (state.struggle >= SHRINK_AFTER) state.choiceCount = MIN_CHOICES;
  }
}
function resetFind(start) {
  state.target = null;
  state.stars = 0;
  state.misses = 0;
  state.choiceCount = MAX_CHOICES;
  state.struggle = 0;
  state.firstTries = 0;
  state.lockId++;
  state.locked = false;
  state.listenAgain = false;
  state.won = false;
  state.tapTimes = [];
  renderStars();
  $("choices").classList.remove("locked");
  if (start) newRound();
}
function newRound() {
  state.misses = 0;
  state.tapTimes = [];
  state.listenAgain = false;
  state.won = false;
  state.lockId++;
  setLocked(false);
  const list = items();
  let t; do { t = Math.floor(Math.random() * list.length); } while (state.target === t && list.length > 1);
  state.target = t;
  const nOthers = Math.min(state.choiceCount - 1, list.length - 1);
  const others = shuffle(list.map((_, i) => i).filter(i => i !== t)).slice(0, nOthers);
  const opts = shuffle([t, ...others]);
  const c = $("choices"); c.innerHTML = "";
  c.classList.toggle("count-3", opts.length === 3);
  c.classList.toggle("count-4", opts.length !== 3);
  opts.forEach((i, k) => {
    const b = document.createElement("button");
    b.className = "choice"; b.textContent = list[i].ch; b.style.background = color(k + t);
    b.dataset.i = i;
    b.setAttribute("aria-label", list[i].name);
    b.onclick = () => pick(i, b);
    c.appendChild(b);
  });
  $("prompt").textContent = promptPhrase() + " 👂";
  play([list[t].findKey, askText(list[t])]);
  preload(opts.map(i => list[i].key));
}
function pick(i, btn) {
  if (state.target === null || state.won) return;
  const rapid = recordTap();
  if (state.locked) { if (rapid) listenAgain(); return; }
  if (btn.classList.contains("faded")) return;
  const list = items();
  if (i === state.target) {
    const tries = state.misses + 1;
    btn.classList.add("right");
    state.won = true;
    state.lockId++;
    setLocked(true);
    const rewarded = tries <= 2;
    if (rewarded) { state.stars++; renderStars(); cheer(); }
    updateAdaptive(tries);
    const my = token + 1; // play() bumps token synchronously; a newer play() cancels the next round
    const parts = [];
    if (rewarded) {
      const k = state.stars % 4;
      parts.push([`praise-${k + 1}`, ["Yay!", "Great job!", "You got it!", "Awesome!"][k]]);
    }
    parts.push([list[i].key, list[i].say]);
    play(...parts).then(() => { if (my === token && state.mode === "find") setTimeout(newRound, 300); });
  } else {
    state.misses++;
    applyHints();
    startMissPause(rapid);
  }
}
function cheer() {
  const el = $("cheer"); el.textContent = ["🎉","🌟","🥳","🎈"][Math.floor(Math.random() * 4)];
  el.classList.remove("hidden"); el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  setTimeout(() => el.classList.add("hidden"), 800);
}
$("hearBtn").onclick = () => { if (state.target === null) newRound(); else { const it = items()[state.target]; play([it.findKey, askText(it)]); } };

// --- Controls ---------------------------------------------------------------------
function refresh() {
  $("setBtn").textContent = state.set === "letters" ? "ABC" : "123";
  $("caseBtn").textContent = state.lower ? "aa" : "Aa";
  $("caseBtn").style.visibility = state.set === "letters" ? "visible" : "hidden";
  renderGrid();
  if (state.mode === "find") resetFind(true);
}
document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
  state.mode = t.dataset.mode;
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === state.mode));
  if (state.mode === "find") { resetFind(false); $("prompt").textContent = "Tap 🔊 to start!"; $("choices").innerHTML = ""; }
});
$("setBtn").onclick = () => { state.set = state.set === "letters" ? "numbers" : "letters"; refresh(); };
$("caseBtn").onclick = () => { state.lower = !state.lower; refresh(); };

preload(["praise-1","praise-2","praise-3","praise-4","lets-listen-again"]);
renderStars();
refresh();
window.__abc = state;
