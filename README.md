# Presetbook

*[Version française](README.fr.md)* · *[Changelog](CHANGELOG.md)*

**A settings notebook.** The presets of an instrument, an amp, a single pedal, a whole pedalboard,
and the plugin chains of a recording program — kept in one page you can search, duplicate and edit.

It was born for bass, and the shipped catalogue shows it. But **nothing in the tool is specific to
bass.** A front panel is described — its knobs, its modes, which controls leave the circuit — and the
interface follows. Not one of the models below cost a line of code.

Named bass amps: **Ampeg SVT-CL** with its five-position mid selector and its two Ultra contours,
**Markbass Little Mark** and its VLE/VPF filters, **TC Electronic BH250**, **Fender Rumble 40** and
**Rumble 500**. Guitar amps: **Fender Blues Junior**, **Vox AC30C2** and its two independent
channels, **Marshall DSL40**, **Boss Katana 50**, **Laney Lionheart L20T-112** down to its white
blue-marked knobs on a stainless panel. Instruments: **Yamaha BB734A**, **Fender Precision** and
**Jazz Bass**, **Music Man StingRay**, **Ibanez SR**. Pedals come as eighteen generic types — a
pedalboard is described by what each box does — plus a few named models where the exact knobs matter:
**Big Muff Pi**, **Tube Screamer TS9**, **Boss DS-1** and **OC-2**, **MXR Dyna Comp**, **SansAmp Bass
Driver DI**, **Darkglass Microtubes B7K**.

Generic templates sit alongside them for anything not on the list, and you can draw your own front
panel from the interface. Keys, a modular synth, a drum machine: if it has knobs, it belongs here.

![The All Star cover, grouped by song: the bass preset with its clock-hour dials next to the Reaper
chain, showing TSE BOD parameters and a ReaEQ band table](docs/images/par-morceau.png)

A preset is shown the way you would read it **on the gear itself**: in clock hours for a knob that's
centre-detented, on its own scale for a graduated one, with the real parameter names of the plugins.
Group by song and one cover gathers its bass, its amp and its chain side by side.

## Try it

A demo account is open on the public instance: click **Try the demo**, or use `demo` / `demo`. Its
presets are wiped every time the server restarts, so feel free to break things.

![The sign-in screen: username and password fields, and below a separator, a Try the demo button
explaining that the account is open to everyone and reset on restart](docs/images/connexion.png)

## Read a preset like you read the gear

Nothing is hard-wired for a particular model. Front panels are described in a declarative registry —
knob types, modes, which controls leave the circuit — and the interface follows.

![Six bass presets for a Yamaha BB734A: each card shows the pickup blend, then Bass, Middle and
Treble as clock dials reading 14 h, 11 h, 14 h, with a note on right-hand technique and
strings](docs/images/basse.png)

A dial at `12 h` is the neutral detent; `14 h 30` is a real position, not a rounding. A control that
is out of circuit in the current mode is greyed with a `—` rather than hidden, so you know it exists.
Values that have no number — a compressor threshold you set by ear — say **à régler**, "set it by
ear", instead of inventing a figure.

## Filter, then print

Two lists of chips — **Gear** and **Styles** — whose counts already account for the other filters in
place. Several choices within one list add up, the two lists intersect. Filtering on a pedal also
brings back the pedalboards that use it.

![The filter panel open: Laney Lionheart and blues selected, the two matching presets
below](docs/images/filtres.png)

The **Print** button puts on paper exactly what is on screen, filters included. The header says what
the sheet holds — active filters, preset count, date — and a preset is never cut across two pages.

![The same view printed: white ground, two columns, no header or buttons, dials still
readable](docs/images/impression.png)

The dark theme is forced to light, and the dial fills are kept: browsers drop background colours when
printing, and a dial without its marker says nothing at all.

## Pedals and pedalboards

A pedalboard is a chain of pedals in signal order, each with its own settings and an in-circuit
switch. Every pedal is drawn from its declared controls: colour, enclosure format, knob count and
placement. Create your own and it is drawn too — no code involved.

![A stage pedalboard: five pedals drawn in signal order, linked by cable arrows — tuner, compressor,
preamp/DI, overdrive, graphic EQ — the bypassed ones greyed out with their LED dark](docs/images/pedalier.png)

The families shipped carry the **conventional control set of their family** — an overdrive has Gain,
Tone and Level; a flanger has Manual, Depth, Rate and Res — never the trade dress of a commercial
model.

## Reaper chains, read and written

`.RfxChain` files import and export. Five plugins have their binary format established and are fully
editable; every other plugin is preserved **byte for byte**.

![The chain editor for All Star: TSE BOD with its eight real parameters, then ReaEQ with one row per
band — type, frequency, gain, bandwidth](docs/images/chaine.png)

Two safeguards. An effect whose values you did not change is rewritten **identically**, so no display
rounding creeps into a setting you never touched. And the export **refuses and names the obstacle**
rather than inventing a state that would crash Reaper — on ReaEQ, only three band types have an
established equivalent in the file format, and the others are chosen in Reaper.

## Two languages

The `FR` / `EN` button switches the interface **and** the catalogue: preset names, notes, control
labels and pedal families. Proper names are left alone — a Yamaha BB734A stays a Yamaha BB734A.

![The same amp presets in English: All / Bass / Amp / Pedal / Pedalboard / Reaper tabs, notes reading
"Mids held up to sit between two distorted guitars"](docs/images/anglais.png)

The decimal separator and the way EQ hours are written follow the language too (`6,5` against `6.5`,
`12 h 30` against `12:30`). Search accepts both languages whichever one is displayed.

## On a phone, and offline

The app **installs**: on Android an **Install** button appears as soon as the browser offers it; on
iPhone it is *Share → Add to Home Screen*. It then opens in its own window, with its icon, and
**opens with no network** — verified with the server stopped, the whole catalogue still renders.

The service worker deliberately goes **to the network first**, falling back on its copy only when the
network does not answer. That is the opposite of the usual reflex: serving the cache first would run a
stale version after every update, with nothing to signal it.

## Run it

```bash
docker run -d -p 8080:8080 -v presetbook-data:/data ghcr.io/fuzzinvaders/presetbook:latest
```

The public image is rebuilt on every commit, for **amd64 and arm64** — it runs on a Raspberry Pi too.
Without Docker, the server has no dependencies at all:

```bash
brew install node   # or the installer from nodejs.org
git clone https://github.com/fuzzinvaders/presetbook.git && cd presetbook && npm start
```

Then <http://localhost:8080>. From localhost the app is **installable** just like on a phone: an
**Install** button in Chrome and Edge, *Add to Dock* in Safari 17 and later. On first open no account exists: the first one created is yours.

Passwords are never stored, only an scrypt derivation with a per-account salt; session tokens are not
stored either, only their SHA-256 fingerprint. The page also works with no server at all — published
as a static page, or opened straight from disk.

## Documentation

| | |
| --- | --- |
| [Running it on a Mac](docs/install-mac.md) 🇬🇧 | a step-by-step guide for people who do not use a terminal: no Docker, no Homebrew, no git |
| [Using Presetbook](docs/using.md) | reading and editing a preset, building a pedalboard, creating a front panel, importing a Reaper chain, sharing, filtering, printing, exporting |
| [Installing and running it](docs/installing.md) | Docker, reverse proxy, updates, accounts, the demo account, security, the third-party script |
| [Developing](docs/developing.md) | architecture, data model, registries, the `.RfxChain` codec, both languages, tests |

## Tests

```bash
npm test
```

Twenty-two suites, 820 checks, nothing to install: the page rendered again in a minimal DOM, the front
panel registry, panels created from the interface, the form that creates them, pedals and their
drawing, the effect-chain codec against a real chain, ReaEQ band types, exporting a preset and
bringing it back into another library, the licence and the donation widget, account creation, the
demo account against a real server, the filters and the print sheet, the phone layout and the install, and the English version — thirteen screens rendered in English,
failing if a French word survives.

## Licence and donations

Copyright © 2026 fuzzinvaders.

**Free software under [AGPL-3.0-or-later](LICENSE), and free of charge.** You may use, study, modify
and redistribute it. The AGPL adds a single obligation to the GPL, and it is the one that matters for
a web application: **if you host a modified version for other people, you must offer them your source
code.** Private use requires nothing.

Donations are **welcome, never asked for** — nothing is limited, nothing expires, no feature waits
for a payment: <https://ko-fi.com/talva>.

The floating button comes from a script served by Ko-fi. It is loaded **only once a session is
open**, so that a third-party script never shares its page with the password field, and it is absent
from the published page. To remove it entirely, empty the `KOFI` constant in `public/index.html`: the
footer link depends on no third party.

The shipped catalogue falls under the same licence. The setting values themselves are facts — an EQ
at 2 o'clock is an EQ at 2 o'clock, and nobody owns that measurement.
