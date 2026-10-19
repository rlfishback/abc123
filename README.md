# ABC 123

A small, phone-friendly website to help a 4-year-old recognize letters (A–Z, upper and lower case) and numbers 0–10.

- **Look:** tap a big tile to see the character with a picture, and hear it spoken ("B is for ball"). Swipe or use the arrows to go through them.
- **Find:** it says "Find the letter M", and the child taps the right one of 4. Correct answers get a cheer and a star.
- **ABC/123** switches between letters and numbers. **Aa** switches upper and lower case.

It's plain HTML, CSS and JS, with no build step and no tracking. Speech uses the browser's built-in voice.

Note: X uses "fox" ("X is in fox"), since X-words that start with the X sound are rare and confusing.

## Run locally
Open `index.html` in a browser, or run `python3 -m http.server` and visit http://localhost:8000.

## Publish (GitHub Pages)
`gh repo create abc123 --public --source . --push`. Then on github.com go to the repo's **Settings**, then **Pages**, choose Deploy from branch, `master` / root. The site will be at https://rlfishback.github.io/abc123/.
