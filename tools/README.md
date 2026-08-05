# Deploy tooling

GitHub Pages serves `main`. The published `index.html` is the Claude Design
export with a soft access gate injected into it.

## Publish an updated bundle

Drop the fresh export over `index.html`, then:

```bash
./tools/deploy.sh
```

The export overwrites the gate, so `deploy.sh` re-injects it before pushing.
Running it twice is harmless — the injector strips any previous gate first.

**Do not commit a fresh export without running this**, or the published page
goes out ungated.

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
