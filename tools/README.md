# Deploy tooling

`main` holds the plain Claude Design export. `gh-pages` is what GitHub Pages
serves, and it is the same bundle with a soft access gate injected.

## Publish an updated bundle

Export to `index.html` on `main` and commit it, then:

```bash
git checkout gh-pages
./tools/deploy.sh
git checkout main
```

`deploy.sh` takes `index.html` from `main` verbatim and re-injects the gate, so
a fresh export never needs hand-editing.

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
