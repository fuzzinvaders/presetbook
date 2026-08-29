# Developing Presetbook

*[Version française](developpement.md)*

## What the application is made of

| File | Role |
| --- | --- |
| `public/index.html` | the whole application: styles, catalogue, registries, interface |
| `public/rfxchain.js` | reading and writing Reaper's effect chains |
| `server.js` | dependency-free server: static files, accounts, persistence API |
| `test/` | nineteen suites, runnable with nothing to install |
| `tools/` | six command-line tools, shipped inside the image |

Two decisions hold up everything else. **The application is a single, self-contained page**, which
lets it run served by this server, published as a static page, or opened from disk. And **nothing is
hard-wired for a particular piece of gear or plugin**: two declarative registries describe front
panels and plugins, and the interface follows from them.

## One page, three contexts

At startup the page tries storage in this order:

1. **this server's API** (`api/presets`), with accounts;
2. **a published page's data file**, writable through the self-publishing capability;
3. **the browser's local storage**, then memory alone.

The sign-in screen only appears in the first case, since the other two have no server. Because
`public/rfxchain.js` is a separate file, chain import and export disappear cleanly where it is not
served: the interface tests for its presence instead of offering a button that would fail.

## The data model

The **shipped catalogue** is the `SEED` constant in `public/index.html`: it is part of the code. The
user's data is separate, and is the only thing written to disk:

```json
{
  "v": 1,
  "custom":    [ /* the presets they created */ ],
  "overrides": { "b-motown": { /* a catalogue preset, edited */ } },
  "gear":      { "g-svt": { /* a front panel they created */ } },
  "hidden":    [ "a-casque" ],
  "trash":     [ { "at": "…", "preset": { }, "gear": { } } ],
  "lang":      "en",
  "updated":   "2026-08-26T09:00:00.000Z"
}
```

The displayed library is the merge of the two, computed at load time. Consequence: growing `SEED`
never destroys the user's work, and ids must stay stable since they are what their edits are attached
to.

The server keeps only these keys. **Adding a persistent notion therefore means adding it to
`sanitizeState` too**, otherwise it would be silently thrown away at the first save. This has already
caught out two features here — the language and the trash — so treat it as a checklist item, not a
warning.

## Adding a preset to the catalogue

In `SEED`, with the factories that shorten the declarations:

```js
forSong(bass("b-allstar", "All Star", ["rock","cover"], "actif", 55,
  {b: pctToCrans(55), m: 0, t: pctToCrans(52)},
  "Médiator, attaque appuyée", "Rondes rodées", "Plus d'attaque, sans devenir métallique."),
  "All Star", "Smash Mouth"),
```

Conventions: on a detented knob the value is a number of **notches from noon** (`0` = 12 h, `+2` =
14 h, `-3` = 9 h) down to a quarter notch, and `pctToCrans()` converts a position given as a
percentage of travel. A blend goes from `0` to `100`. On a scale, the value is the one on the panel.

The catalogue is written **in French** — it is the source language, see [Both languages](#both-languages).
A new preset therefore needs its English entries in the `EN` dictionary, and `test/langue.test.js`
will tell you exactly which ones are missing.

## The front panel registry

```js
"bb734a": {
  kind:"bass", brand:"Yamaha", model:"BB734A", face:"bass", dim:"passif",
  modes:{ options:["actif","passif"], off:{ passif:["eq.b","eq.m"] } },
  controls:[
    {k:"balance", t:"balance", l:"Balance", a:"P", b:"J", d:50},
    {k:"eq.b", t:"clock", l:"Bass", d:0},
    {k:"eq.t", t:"clock", l:"Treble", lAlt:{passif:"Tonalité"}, d:0}
  ],
  extras:[{k:"tech", l:"Main droite"}, {k:"strings", l:"Cordes"}]
}
```

| Type | Rendering |
| --- | --- |
| `clock` | dial detented at noon, ±5 notches by quarters, displayed in hours |
| `scale` | bounded scale with its decimals |
| `balance` | 0 for the first pickup, 100 for the second |
| `switch` | a switch, rendered as a label on the card |
| `slider` | vertical slider, a graphic EQ band in decibels |

`modes` gives a selector and, for each mode, the list of controls that are **out of circuit**. `needs`
makes one control depend on another. `face` picks the knob appearance: `bass`, `amp`, `laney` or
`plain`. `lAlt` changes a label depending on the mode.

**Keys are paths**: `eq.b` nests under `eq`, and a control created from the interface gets a key
`c.<label>`, so under `c`. That is what cleanly separates a personal control from a shipped one.

## Pedals

A pedal is a front panel: it goes into the same registry, with `kind:"pedal"` and an enclosure
colour. The `PEDALS` shortcut describes the shipped families, and a loop pours them into `GEAR` at
load time.

```js
"pd-od": {model:"Overdrive", color:"#E9D53F",
          controls:[pk("gain","Gain",4), pk("tone","Tone",5), pk("level","Level",6)]},
```

`pk()` declares a knob from 0 to 10, `fader()` a graphic EQ band in decibels. Three fields decide the
enclosure's look: `color`, `style` (an entry of `PEDAL_STYLES`) and `perRow`.

`PEDAL_STYLES` describes **formats** — `std`, `treadle`, `tall`, `big`, `mini` — each with a default
number of knobs per row, a margin, a foot-control shape and a name size. They are templates, not
brands.

The **drawing** is generated by `pedalArt(gear, values)`: `luma()` decides the text colour from the
enclosure's, and each row of knobs is **centred across the width** — including the last one when
incomplete, which gives the classic three-knob triangle. Nothing is coded for a particular family, so
a pedal created from the interface is drawn too.

Mind the name: `fader()` builds a control **description**, while `faderCell()` produces its
**rendering**. The collision between the two once broke the catalogue's construction — the second
declaration overwrote the first.

A **pedalboard** (`kind:"board"`) carries `slots:[{gear, on, role, v}]`: `v` holds that pedal's
values, which lets the same family appear twice with different settings. `boardArt()` draws them side
by side, joined by a cable.

## The plugin registry

Two shapes, depending on whether the plugin has parameters or bands:

```js
"ReaComp": { params:[ {k:"attack", l:"Attack", min:0, max:500, step:1, d:3, u:"ms"}, … ] },
"ReaEQ":   { bands:{ types:[…], dflt:{t:"Band", f:1000, g:0, bw:1} } }
```

`t:"bool"` gives a checkbox, `t:"enum"` with `opts` a dropdown, `inf:true` displays `−∞` at the
minimum, and the number of decimals follows the `step` — a parameter with a step of `0.01` displays
`0.60`, as the plugin does. A field left **empty** means "set it by ear".

Names, units and bounds must come from the plugin's **real window**, never from an invented scale.
Reaper's "generic parameters" view is the best source: it gives the exact order and the units.

## The effect-chain codec

`public/rfxchain.js` reads and rewrites a `.RfxChain`, which is text: a list of effects, each with its
`BYPASS` state, its identity and its state encoded in base64.

| Plugin | State |
| --- | --- |
| **TSE BOD** | named **XML**: `BOD_Input`, `BOD_Drive`, `BOD_Bass`, `BOD_Treble`… Fully editable |
| **ReaEQ** | 33-byte bands: type (integer), enabled, frequency and bandwidth as `double`, **gain as a linear ratio** (1.2589 = +2.0 dB) |
| **ReaComp** | an 8-byte signature then **21 floats**, in the generic view's order |
| **ReaVerbate** | same principle, **8 floats** |
| **JSFX** | sliders in plain text, `-` meaning "at default" |
| **Others** | binary block **preserved byte for byte**, not interpreted |

Scales established by crossing real chains with their known values: Threshold, Wet and Dry are linear
amplitudes (`-150 dB` meaning `-inf`); Ratio is `(r-1)/99`; Attack, Release, Pre-comp, RMS and Knee
are normalised over `500 ms`, `5000 ms`, `500 ms`, `100 ms` and `24 dB`; frequencies over `20 kHz`,
verified on two independent points.

Two fidelity rules, which the tests enforce:

- **a parameter whose displayed value has not changed is rewritten with its original float.** Without
  that precaution, display rounding would creep into a setting nobody touched;
- **no guessing.** The ReaEQ band types the plugin displays are Low Shelf, High Shelf, Band, Low
  Pass, High Pass, All Pass, Notch, Band Pass, Parallel Band Pass, Band (alt), Band (alt 2), but
  **the stored integer does not follow that order**: 3 and 4 are indeed Low Pass and High Pass, while
  "Band", third in the menu, is stored as 8. Only those three are established; the export refuses an
  unknown type, naming the band, and an integer coming from an import is preserved as it is.

To complete the table: in Reaper, a lone ReaEQ, eleven bands, band *n* set to the *n*-th type in the
menu, then

```bash
npm run learn:eqtypes -- witness.RfxChain
```

The tool reads the integers in order and prints the table to copy over. It refuses if the witness
does not match the menu, or if a band contradicts an already known mapping.

## Both languages

French is the **source** language: the catalogue, the labels and the messages are written in French
in the code, and the `EN` dictionary is keyed by the French string itself. There are therefore no keys
to invent, and a sentence with no translation shows in French rather than disappearing.

Everything goes through **three** points, and three only:

| Function | What it translates |
| --- | --- |
| `esc(s)` | any displayed content — so the whole catalogue, without thinking about it |
| `tHtml(h)` | the texts of an HTML fragment, between `>` and `<`; a fragment with no tag is translated whole |
| `tf(pattern, …)` | a message with holes: `"La commande {0} n'a pas de libellé."` |

`tHtml` **does not touch attributes**: a `placeholder` or an `aria-label` is translated by hand with
`t()`, as `renderChrome()` does for the header. That is deliberate — translating attributes would
break the `data-*` the event handlers rely on.

Practical consequence: **a string concatenated before reaching `esc` or `tHtml` is never translated**,
since the composed sentence does not exist in the dictionary. Two reflexes:

```js
toast(used + " fiche utilise…");                     /* no: never translated */
toast(tf("{0} fiche utilise…", used));               /* yes */
'<p>' + n + ' pédales dans l’ordre du signal</p>'    /* no */
'<p>' + n + ' ' + t("pédales dans l’ordre du signal") + '</p>'   /* yes */
```

Two values follow the language without going through the dictionary: `dec()` for the decimal
separator, and `hourLabel()` for how EQ hours are written. Search, for its part, stacks both
languages into its haystack, so an English word finds a preset displayed in French and the other way
round.

The language comes, in order of priority, from `?lang=`, then from `S.lang` saved with the user's
data, then from the browser. `setLang()` remembers it and saves; `server.js` has to let it through
`sanitizeState`, otherwise it would be lost on the first round trip.

`test/langue.test.js` is the net: it renders **thirteen screens** in English and fails if it finds a
French word there, re-reads the transient messages straight from the source to check they all have a
translation, and verifies that French has not moved. After adding content, running it tells you
exactly what the dictionary is missing.

## Tools

```bash
npm run import:rfx -- 90srock.RfxChain          # a readable summary of a chain
node tools/rfxchain-import.js chain.RfxChain --json
npm run learn:eqtypes -- witness.RfxChain
npm run captures                                # redoes the README images
npm run icones                                  # redoes the PNGs from public/icone.svg
npm run admin                                   # sees and moves the administrator role
npm run motdepasse -- <username>                # reissues a password
```

The last two need `DATA_DIR` pointing at the server's data folder, and they ship inside the Docker
image so they can be run from the container.

### Installing and offline

`public/manifest.webmanifest`, `public/sw.js` and `public/icone.svg` are enough to make the app
installable. The PNGs are generated from the SVG by `npm run icones`: the drawing has a single
source.

The service worker goes **to the network first**, and only uses the cache when the network does not
answer. That is the opposite of the usual reflex, and it is deliberate: a service worker serving the
cache first runs a stale version after every update, with nothing to signal it. On a page updated
often that is the worst possible defect — and it already happened here without a service worker,
which is what earned us the `/healthz` probe.

Two paths are never cached: `/api/` and `/healthz`. The first carries account state, the second exists
precisely to tell which version is running. And registration passes `updateViaCache:"none"`, without
which the `max-age=3600` on `.js` files would keep a stale worker for an hour before even checking.

The service worker does not register from a `file://` nor in the published page. A warning if you test
it: **the browser pane built into Claude Code refuses service workers** — verifying needs a real
browser.

### The README screenshots

`tools/captures.js` renders the application in a headless browser and writes the PNGs in
`docs/images/`. The views are reached through the **URL parameters the application already
understands** (`?kind=`, `?group=`, `?q=`, `?edit=`, `?lang=`): that is what makes them reproducible
without driving a mouse, and the reason not to add a view that would need a click.

It looks for Edge then Chrome in the usual places; `NAVIGATEUR=/path/to/chromium` takes precedence.
Screenshots are taken from `file://`, so with no server — only `connexion.png` needs one, and the tool
recalls the procedure rather than leaving you to guess it.

After a visible interface change, run the tool again and look at which images changed: that is also a
review of the rendering. The total weight stays under a megabyte, worth watching if views are added.

## Tests

```bash
npm test
```

Nineteen suites, nothing to install. Some replay the page in a minimal DOM, others start a **real
server** — rights, sessions and disk writes cannot be verified any other way.

| Suite | What it covers |
| --- | --- |
| `harness.js` | the page's real rendering: catalogue, dials, panels, chains |
| `gear.test.js` | the panel registry, defaults, out-of-circuit controls |
| `gearcustom.test.js` | created panels, the merged registry, preservation |
| `gearform.test.js` | the panel list and form |
| `pedals.test.js` | the pedal registry, their drawing, a pedalboard's chaining |
| `rfxchain.test.js` | the codec on a real chain, round trip and edits |
| `eqtypes.test.js` | band types: refusal, preservation, adding and removing |
| `export.test.js` | exporting a preset and bringing it back into another library |
| `licence.test.js` | the licence, the SPDX headers, the donation widget's safeguards |
| `comptes.test.js` | the account screens per role, and refusals before any network call |
| `filtres.test.js` | the facets, their crossed counts, the print stylesheet |
| `mobile.test.js` | the viewport tag, the narrow rules, the manifest, the service worker |
| `demo.test.js` | *server* — the demo account's four separations |
| `compression.test.js` | *server* — what actually goes over the wire, in raw HTTP |
| `motdepasse.test.js` | *server* — password, roles, account deletion |
| `invitations.test.js` | *server* — an invitation's life cycle, and the self-refreshing demo |
| `partage.test.js` | *server* — publishing, copying, removing, and what is refused |
| `corbeille.test.js` | *server* — trash, snapshots, and file integrity |
| `langue.test.js` | the English audit: thirteen screens, no French word tolerated |

`test/sandbox.js` runs the page's script in a minimal DOM, under `node:vm`. For that the page exposes
`window.__pb`, a **read-only test seam** giving access to the registries and pure functions with no
effect on the interface. That bench caught two errors no screenshot showed clearly: a registry read
before its definition, and an access to a key missing from a plugin definition.

A real fixture, `test/fixtures/90srock.RfxChain`, serves as the codec's reference.

## The published mirror

`public/index.html` is also published as a standalone page. The mirror carries only that file: the
functions depending on `rfxchain.js` fade out by themselves, and the sign-in screen does not appear
for lack of a server. Any change to the page therefore has to stay readable in both contexts.
