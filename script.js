// ABC 123: letter and number recognition for little kids.
// Two modes: "Look" (tap a tile to see and hear it) and "Find" (hear one, tap the match).
const LETTERS = [
  ["A","apple","🍎"],["B","ball","⚽"],["C","cat","🐱"],["D","dog","🐶"],["E","egg","🥚"],
  ["F","fish","🐟"],["G","goat","🐐"],["H","hat","🎩"],["I","igloo","🛖"],["J","juice","🧃"],
  ["K","kite","🪁"],["L","lion","🦁"],["M","moon","🌙"],["N","nest","🪺"],["O","octopus","🐙"],
  ["P","pig","🐷"],["Q","queen","👑"],["R","rainbow","🌈"],["S","sun","☀️"],["T","tree","🌳"],
  ["U","umbrella","☂️"],["V","van","🚐"],["W","whale","🐳"],["X","fox","🦊"],["Y","yo-yo","🪀"],["Z","zebra","🦓"],
];
const NUM_WORDS = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"];
const NUM_ICON = "⭐";
const COLORS = ["--c1","--c2","--c3","--c4","--c5","--c6"];

const state = { mode: "explore", set: "letters", lower: false, idx: 0, target: null, streak: 0 };
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
    ch: String(n), name: w, word: w, pic: n === 0 ? "🫙" : NUM_ICON.repeat(n), say: `${w}`,
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
function stopAll() {
  token++; queue = [];
  if (cur) { cur.pause(); cur = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
function playOne([key, text], my) {
  return new Promise(res => {
    const a = clip(key); cur = a;
    let done = false;
    const fin = (ok) => { if (done) return; done = true; a.onended = a.onerror = null;
      if (!ok && my === token) fallback(text).then(res); else res(); };
    a.onended = () => fin(true); a.onerror = () => fin(false);
    try { a.currentTime = 0; } catch (e) {}
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
  items().forEach((it, i) => {
    const b = document.createElement("button");
    b.className = "tile"; b.textContent = it.ch; b.style.background = color(i);
    b.setAttribute("aria-label", it.name);
    b.onclick = () => openCard(i);
    g.appendChild(b);
  });
}
function openCard(i) {
  const list = items(); state.idx = (i + list.length) % list.length;
  const it = list[state.idx];
  $("cardChar").textContent = it.ch; $("cardChar").style.color = color(state.idx);
  $("cardPic").textContent = it.pic; $("cardWord").textContent = it.word;
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
function newRound() {
  const list = items();
  let t; do { t = Math.floor(Math.random() * list.length); } while (state.target === t && list.length > 1);
  state.target = t;
  const others = shuffle(list.map((_, i) => i).filter(i => i !== t)).slice(0, 3);
  const opts = shuffle([t, ...others]);
  const c = $("choices"); c.innerHTML = "";
  opts.forEach((i, k) => {
    const b = document.createElement("button");
    b.className = "choice"; b.textContent = list[i].ch; b.style.background = color(k + t);
    b.setAttribute("aria-label", list[i].name);
    b.onclick = () => pick(i, b);
    c.appendChild(b);
  });
  $("prompt").textContent = (state.set === "letters" ? "Find the letter" : "Find the number") + " 👂";
  play([list[t].findKey, askText(list[t])]);
  preload(opts.map(i => list[i].key));
}
function pick(i, btn) {
  const list = items();
  if (i === state.target) {
    btn.classList.add("right"); state.streak++;
    $("stars").textContent = "⭐".repeat(Math.min(state.streak, 10));
    cheer();
    const k = state.streak % 4;
    const my = token + 1; // play() bumps token synchronously; a newer play() cancels the next round
    play([`praise-${k + 1}`, ["Yay!", "Great job!", "You got it!", "Awesome!"][k]], [list[i].key, list[i].say])
      .then(() => { if (my === token && state.mode === "find") setTimeout(newRound, 300); });
  } else {
    btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong");
    play(["thats", "That's"], [list[i].nameKey, list[i].name], ["try-again", "Try again!"]);
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
  if (state.mode === "find") { state.target = null; state.streak = 0; $("stars").textContent = ""; newRound(); }
}
document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
  state.mode = t.dataset.mode;
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === state.mode));
  if (state.mode === "find") { state.target = null; state.streak = 0; $("stars").textContent = ""; $("prompt").textContent = "Tap 🔊 to start!"; $("choices").innerHTML = ""; }
});
$("setBtn").onclick = () => { state.set = state.set === "letters" ? "numbers" : "letters"; refresh(); };
$("caseBtn").onclick = () => { state.lower = !state.lower; refresh(); };

preload(["praise-1","praise-2","praise-3","praise-4","thats","try-again"]);
refresh();
