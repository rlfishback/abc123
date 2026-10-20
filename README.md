# ABC 123

A small, phone-friendly website to help a 4-year-old recognize letters (A–Z, upper and lower case) and numbers 0–10.

- **Look:** tap a big tile to see the character with a picture, and hear it spoken ("B is for ball"). Swipe or use the arrows to go through them.
- **Find:** it says "Find the letter M", and the child taps the right one of 4. Correct answers get a cheer and a star.
- **ABC/123** switches between letters and numbers. **Aa** switches upper and lower case.

It's plain HTML, CSS and JS, with no build step and no tracking. Speech is pre-recorded MP3 clips in `audio/` (the browser's built-in voice is only a fallback if a clip fails to load).

Note: X uses "fox" ("X is in fox"), since X-words that start with the X sound are rare and confusing.

## Voice
Clips are generated with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0), voice `af_heart` at speed 0.9, via [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx). Sentences like "That's B. Try again!" are played as short clips in sequence. Letter names are spelled phonetically ("Bee", "Zee") so they're said as names, and A is forced to /eɪ/ because espeak reads "A" mid-sentence as "uh".

To regenerate (the venv and model files stay out of git), see the header of `tools/make_audio.py`, then from the repo root run `python tools/make_audio.py --model /path/to/model-dir`.

## Run locally
Open `index.html` in a browser, or run `python3 -m http.server` and visit http://localhost:8000.

## Publish (GitHub Pages)
`gh repo create abc123 --public --source . --push`. Then on github.com go to the repo's **Settings**, then **Pages**, choose Deploy from branch, `master` / root. The site will be at https://rlfishback.github.io/abc123/.
