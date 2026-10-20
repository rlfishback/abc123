#!/usr/bin/env python3
"""Regenerate audio/*.mp3 with Kokoro-82M (Apache-2.0) via kokoro-onnx.

Setup (not committed):
  python3 -m venv .kokoro-venv && . .kokoro-venv/bin/activate
  pip install kokoro-onnx soundfile ; apt install ffmpeg
  download kokoro-v1.0.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
Run: python tools/make_audio.py --model DIR   (from the repo root)
"""
import argparse, os, subprocess, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro
from kokoro_onnx.tokenizer import Tokenizer

VOICE, SPEED = "af_heart", 0.9
# Letter names spelled out so the voice says "bee", not a "b" sound.
NAMES = dict(A="Ay", B="Bee", C="See", D="Dee", E="Ee", F="Eff", G="Gee", H="Aitch",
             I="Eye", J="Jay", K="Kay", L="El", M="Em", N="En", O="Oh", P="Pee",
             Q="Cue", R="Are", S="Ess", T="Tee", U="You", V="Vee", W="Double you",
             X="Ex", Y="Why", Z="Zee")
WORDS = dict(A="apple", B="ball", C="cat", D="dog", E="egg", F="fish", G="goat", H="hat",
             I="igloo", J="juice", K="kite", L="lion", M="moon", N="nest", O="octopus",
             P="pig", Q="queen", R="rainbow", S="sun", T="tree", U="umbrella", V="van",
             W="whale", X="fox", Y="yo-yo", Z="zebra")
NUMS = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"]
GAP = 0.8  # seconds of silence between the letter and its phrase on card clips
PRAISE = ["Yay!", "Great job!", "You got it!", "Awesome!"]

def clips():
    for L, n in NAMES.items():
        l = L.lower(); w = WORDS[L]
        yield f"letter-{l}", f"{n}."
        # Card = letter name, GAP seconds of silence, then the phrase (two separate syntheses).
        yield f"card-{l}", (f"{n}.", f"{n} is in {w}." if L == "X" else f"{n} is for {w}.")
        yield f"find-letter-{l}", f"Find the letter {n}."
    for i, w in enumerate(NUMS):
        yield f"num-{i}", f"{w.capitalize()}."
        yield f"find-number-{i}", f"Find the number {w}."
    for i, p in enumerate(PRAISE, 1):
        yield f"praise-{i}", p
    yield "thats", "That's"
    yield "try-again", "Try again!"

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--model", default="../.kokoro-model")
    ap.add_argument("--out", default="audio"); a = ap.parse_args()
    k = Kokoro(os.path.join(a.model, "kokoro-v1.0.onnx"), os.path.join(a.model, "voices-v1.0.bin"))
    tok = Tokenizer()
    os.makedirs(a.out, exist_ok=True)
    TRIM = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse"
    def synth(text, path):
        if "Ay" in text:  # espeak reads "Ay" as "eye" and a bare "A" as "uh": force /eI/
            ph = tok.phonemize(text.replace("Ay", "Hay"), "en-us").replace("hˈeɪ", "ˈeɪ")
            s, sr = k.create(ph, voice=VOICE, speed=SPEED, is_phonemes=True)
        else:
            s, sr = k.create(text, voice=VOICE, speed=SPEED, lang="en-us")
        sf.write(path, s, sr)
        return sr
    with tempfile.TemporaryDirectory() as td:
        for key, text in clips():
            out = os.path.join(a.out, key + ".mp3")
            parts = text if isinstance(text, tuple) else (text,)
            wavs = [os.path.join(td, f"p{i}.wav") for i in range(len(parts))]
            sr = [synth(t, w) for t, w in zip(parts, wavs)][0]
            cmd = ["ffmpeg", "-y", "-loglevel", "error"]
            for w in wavs: cmd += ["-i", w]
            if len(wavs) == 1:
                cmd += ["-af", TRIM]
            else:  # trim each part, insert GAP of silence between them
                cmd += ["-f", "lavfi", "-t", str(GAP), "-i", f"anullsrc=r={sr}:cl=mono"]
                g = len(wavs)
                f = ";".join(f"[{i}]{TRIM}[t{i}]" for i in range(g))
                seq = "".join(f"[t{i}]" + (f"[{g}]" if i == 0 else "") for i in range(g))
                cmd += ["-filter_complex", f"{f};{seq}concat=n={g + 1}:v=0:a=1"]
            subprocess.run(cmd + ["-ac", "1", "-b:a", "48k", out], check=True)
            print(key, "=", " | ".join(parts))

if __name__ == "__main__":
    main()
