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
    }));
  }
  return NUM_WORDS.map((w, n) => ({
    ch: String(n), name: w, word: w, pic: n === 0 ? "🫙" : NUM_ICON.repeat(n), say: `${w}`,
  }));
}
const color = (i) => `var(${COLORS[i % COLORS.length]})`;

// --- Speech -----------------------------------------------------------------
let voice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices().filter(v => v.lang.startsWith("en"));
  voice = vs.find(v => /samantha|google us english|zira|aria|jenny/i.test(v.name)) || vs[0] || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = 0.85; u.pitch = 1.15;
  speechSynthesis.speak(u);
}

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
  say(it.say);
}
$("closeBtn").onclick = () => $("card").classList.add("hidden");
$("card").onclick = (e) => { if (e.target.id === "card") $("card").classList.add("hidden"); };
$("prevBtn").onclick = () => openCard(state.idx - 1);
$("nextBtn").onclick = () => openCard(state.idx + 1);
$("sayBtn").onclick = () => say(items()[state.idx].say);

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
  $("prompt").textContent = askText(list[t]);
  say(askText(list[t]));
}
function pick(i, btn) {
  const list = items();
  if (i === state.target) {
    btn.classList.add("right"); state.streak++;
    $("stars").textContent = "⭐".repeat(Math.min(state.streak, 10));
    cheer(); say(["Yay!", "Great job!", "You got it!", "Awesome!"][state.streak % 4] + " " + list[i].say);
    setTimeout(newRound, 2200);
  } else {
    btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong");
    say(`That's ${list[i].name}. Try again!`);
  }
}
function cheer() {
  const el = $("cheer"); el.textContent = ["🎉","🌟","🥳","🎈"][Math.floor(Math.random() * 4)];
  el.classList.remove("hidden"); el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  setTimeout(() => el.classList.add("hidden"), 800);
}
$("hearBtn").onclick = () => { if (state.target === null) newRound(); else say(askText(items()[state.target])); };

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

refresh();
