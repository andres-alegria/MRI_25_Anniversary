# Deploy tooling

GitHub Pages serves `main`. The published `index.html` is the Claude Design
export with a soft access gate injected into it.

## Publish an updated bundle

Drop the fresh export over `index.html`, then:

```bash
./tools/deploy.sh
```

The export overwrites both the gate and the story wiring, so `deploy.sh`
re-applies them before pushing. Running it twice is harmless — both injectors
detect their own previous work and skip or strip it first.

**Do not commit a fresh export without running this**, or the published page
goes out ungated and back to placeholder stories.

## Editing story content

All editorial text lives in `stories-data.js` at the repo root — never inside
`index.html`. That is what keeps the writing safe from a re-export. Edit that
file, then run `./tools/deploy.sh`.

Each story has a `status`: `'draft'` renders the real text, `'pending'` renders
a short "in development" line instead. `tools/apply-content.py` is what teaches
the bundled page to read that file.

## The cross-cutting figures

The four infographics live in `figures/` as 16:9 JPGs, with their titles and
captions in `figures-data.js`. They are deliberately not numbered on the
mountain — in the report they are chapter-level figures, not stories.

The section takes any number of entries, so adding a fifth is a data edit.

To regenerate the stand-in images:

```bash
python3 tools/make-figure-placeholders.py
```

Delete that script once the real figures land.

## Change the passphrase

```bash
python3 tools/set-password.py   # prompts; stores only a SHA-256 digest
./tools/deploy.sh
```

Visitors who already unlocked keep access for 30 days (`REMEMBER_DAYS` in
`gate.js`); clearing that window means changing the key name in `gate.js`.

## What the gate is and isn't

It blocks the bundler from unpacking, so the content never reaches the DOM
without the passphrase. But the content ships inside the same HTML file and
this repo is public — view-source or the repo itself both bypass it. It deters
casual link-sharing; it is not access control.

For real protection the content would need to be encrypted at rest and the repo
made private (GitHub Pages from a private repo requires a paid plan).

## The motion layer

`motion.js` holds the GSAP choreography and sits beside `stories-data.js` and
`figures-data.js` — outside the bundle, so a Claude Design re-export leaves it
alone. `apply-content.py` injects the four script tags; nothing else in the
pipeline knows about it. Delete the file and the page still works.

GSAP is vendored in `vendor/` rather than pulled from a CDN, so the publication
does not depend on a third party staying up. To update:

```bash
V=$(curl -s https://registry.npmjs.org/gsap/latest | python3 -c 'import sys,json;print(json.load(sys.stdin)["version"])')
for f in gsap.min.js DrawSVGPlugin.min.js Flip.min.js; do
  curl -sfL -o "vendor/$f" "https://cdn.jsdelivr.net/npm/gsap@$V/dist/$f"
done
echo "$V" > vendor/GSAP_VERSION
```

Timings and colours live in the `MOTION` object at the top of `motion.js`.
`MRI_MOTION.replay()` re-runs the opening from the console;
`MRI_MOTION.replay().pause(1.4)` freezes it partway for tuning.
