# Presetbook

*[Version française](README.fr.md) — the documentation in `docs/` is in French for now.*

A settings notebook: the presets of an instrument, an amp, a single pedal, a whole pedalboard, and
the plugin chains of a recording program, kept in one page you can search, duplicate and edit.

A preset is shown the way you would read it **on the gear itself** — in clock hours for a knob
that's centre-detented, on its own scale for a graduated one, with the real parameter names of the
plugins. Nothing is hard-wired for a particular model: front panels and plugins are described in
declarative registries, and the interface follows. So you can add your own gear — down to drawing a
pedal, its colour and the placement of its knobs — without touching the code.

Available in French and English: the `FR` / `EN` button switches the interface **and** the
catalogue, leaving proper names alone.

## Try it

A demo account is open on the public instance — click **Try the demo** on the sign-in screen, or use
`demo` / `demo`. Its presets are wiped every time the server restarts, so feel free to break things.

## Run it

```bash
docker run -d -p 8080:8080 -v presetbook-data:/data ghcr.io/fuzzinvaders/presetbook:latest
```

The public image is rebuilt on every commit, for **amd64 and arm64** — it runs on a Raspberry Pi
too. Without Docker, the server has no dependencies at all:

```bash
git clone https://github.com/fuzzinvaders/presetbook.git && cd presetbook && npm start
```

Then <http://localhost:8080>. On first open no account exists: the first one created is yours.

## What is in it

- **Five kinds of preset** — instrument, amp, pedal, pedalboard, plugin chain — each attachable to a
  song, so the bass, the amp and the chain of one cover gather together.
- **Reaper chains, read and written.** `.RfxChain` files import and export. Five plugins have their
  binary format established and are fully editable; every other plugin is preserved **byte for
  byte**. An effect whose values you did not change is rewritten identically, and the export
  **refuses and names the obstacle** rather than inventing a state that would crash Reaper.
- **Your own gear.** Front panels, pedals and pedalboards are yours to create, with knob types that
  match real controls: clock dials, bounded scales, pickup blends, switches, EQ faders.
- **No dependencies.** One HTML page and one Node file. It also works with no server at all —
  published as a static page, or opened from disk.

## Documentation

| | |
| --- | --- |
| [Using Presetbook](docs/utilisation.md) 🇫🇷 | reading and editing a preset, building a pedalboard, creating a front panel, importing a Reaper chain, switching language, exporting |
| [Installing and running it](docs/installation.md) 🇫🇷 | Docker, reverse proxy, updates, accounts, the demo account, security, the third-party script |
| [Developing](docs/developpement.md) 🇫🇷 | architecture, data model, registries, the `.RfxChain` codec, both languages, tests |

## Tests

```bash
npm test
```

Twelve suites, 373 checks, nothing to install: the page rendered again in a minimal DOM, the front
panel registry, panels created from the interface, the form that creates them, pedals and their
drawing, the effect-chain codec against a real chain, ReaEQ band types, exporting a preset and
bringing it back into another library, the licence and the donation widget, account creation, the
demo account against a real server, and the English version — thirteen screens rendered in English,
failing if a French word survives.

## Licence and donations

Copyright © 2026 fuzzinvaders.

**Free software under [AGPL-3.0-or-later](LICENSE), and free of charge.** You may use, study, modify
and redistribute it. The AGPL adds a single obligation to the GPL, and it is the one that matters for
a web application: **if you host a modified version for other people, you must offer them your source
code.** Private use requires nothing.

That is the right fit for a self-hostable tool: it keeps improvements shareable even when the
application is served rather than distributed.

Donations are **welcome, never asked for** — nothing is limited, nothing expires, no feature waits
for a payment: <https://ko-fi.com/talva>.

The floating button comes from a script served by Ko-fi. It is loaded **only once a session is
open**, so that a third-party script never shares its page with the password field, and it is absent
from the published page. To remove it entirely, empty the `KOFI` constant in `public/index.html`: the
footer link depends on no third party.

The shipped catalogue falls under the same licence. The setting values themselves are facts — an EQ
at 2 o'clock is an EQ at 2 o'clock, and nobody owns that measurement.
