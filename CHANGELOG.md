# Changelog

What each version brings, and why. [Français](CHANGELOG.fr.md).

Versions follow [semantic versioning](https://semver.org/): the first number changes when an update
needs your intervention, the second when things are added, the third when only defects are fixed. No
update has ever required touching your data: it lives in a volume the image knows nothing about.

To stay on a given version rather than following the tip:

```yaml
image: ghcr.io/fuzzinvaders/presetbook:v1.14.0   # instead of :latest
```

And to find out which one is running on your machine, without digging through the container:

```bash
curl -s https://your-domain/healthz
docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' presetbook
```

---

## 1.14.0 — 25 November 2026

### Added

- **The Zoom B2 FOUR, a sixth kind of preset.** A patch is described whole: its number (001 to 300), the effects in
  signal order with their parameters under their exact name, the amp models in the same chain, the bass with its
  knobs, strings, gauge and playing style, and a level to check with the band. The card shows the chain from input
  to output, block by block; the editor offers effects by category and tells at once whether the preset fits the
  unit.
- **A catalogue taken from ZOOM's documents, and from them only**: 104 effects, 522 parameters, their ranges and
  value lists, the dependencies between settings. What ZOOM does not publish is not made up — no default value, no
  unit that is not printed, no step for frequencies. The full list and the JSON schema are generated from the
  catalogue (`node tools/zoom-docs.js`), and a test checks they are up to date.
- **The unit's rules**: five effects at most, a single amp, a single pedal. A preset that would not fit is not
  saved; a second amp or a sixth slot is not offered.
- **Variants** of the same song (verse and chorus, with or without drive), each on its own patch.
- **Banks**: a setlist becomes the bank for a gig. It holds the DI MODEL, a global setting of the unit, lists its
  patches (duplicates flagged) and exports as one `.json` file.
- **Checked import** of a preset or a bank, by dropping it or through *Import a file*: what cannot fit the unit is
  refused, an unknown parameter or an out-of-range value is flagged without being lost, a newer format version is
  refused. A report says, preset by preset, what came in and why. Exporting then re-importing gives the presets back
  unchanged.
- An importable example, **REPTILIA**, and an example bank, in `docs/exemples`.

### Fixed

- On a phone, the edit sheet of a Reaper chain overflowed the screen by a few pixels: a form frame would not shrink
  below the width of the plugin list.

---

## 1.13.0 — 19 November 2026

### Added

- **The chorus that ships with Reaper (JSFX guitar/chorus) is established.** Its six sliders read
  and are set under their names — Chorus Length, Number Of Voices, Rate, Pitch Fudge Factor, Wet
  Mix, Dry Mix — with the ranges and defaults of its source. A chorus added by hand is written the
  way the plugin opens.

### Fixed

- **MCompressor's threshold was displayed at half its value.** The plugin stores its threshold on a
  40·log10 scale, not 20·log10: a chain set to −20.6 dB displayed −10.3 dB. The file written was
  right — the number was what lied. The "Crossfire" preset now shows −19.9 dB, as Reaper does.
- **Older presets are converted when they open**, byte for byte in the file: the stored threshold
  is doubled, and the exported sound does not move. A `.presetbook.json` exported before the fix,
  or a preset from the shelf, is converted the same way on import.
- **An unknown JSFX no longer has a "Drive".** Its first slider was shown under the Saturation's
  name; it now keeps its sliders as they are, with no invented name.
- **After an update, the page could run for an hour with the old chain reader.** The server let
  the browser keep `rfxchain.js` for an hour, while the page itself was always re-read. Scripts are
  now revalidated on every visit, like the page — a single question to the server, nothing is
  downloaded again if they have not changed.

---

## 1.12.0 — 19 November 2026

### Added

- **An exported preset can be imported back from its file.** "Export" wrote a `.presetbook.json`,
  but taking it back meant opening it in a text editor, copying its contents and pasting them into
  the backup block. The file now comes in like a Reaper chain: **dropped on the page**, or picked
  through **Backup → Import a file**. Several files dropped together make as many presets.
- The contents decide what happens, as in the block: a **single preset is added** — a duplicate gets
  a fresh id and *(imported)* in its name, nothing is overwritten. A **full backup** would replace
  the whole library: a file dropped on the page cannot stand for that order, so it **lands in the
  block** and waits for "Restore".

---

## 1.11.2 — 13 November 2026

### Fixed

- **The Fender Deluxe Active Jazz Bass's dials read like a BB's**, in hours from twelve, with the
  detent pointing up. On this plate the detent does not fall at twelve but **at the bottom left**,
  and travel reads **as a percentage**: 50 % at the detent, 0 % at the cut stop, 100 % at the boost
  stop. A grey mark on the rim shows the detent — without it, a needle at the bottom left has
  nothing to be compared against. Nothing changes in the data: the stored value is still the number
  of notches from the detent, exactly (percentage − 50) / 10.
- The shipped "Crossfire" values were rounded to the quarter notch, which displayed 52.5 % where the
  preset says 52 %. A control read as a percentage has no intermediate step to aim for.
- The editor steps by one percent on this plate rather than by quarter notches — nobody sets a bass
  by 2.5 %.

---

## 1.11.1 — 13 November 2026

### Fixed

- **The chain-drop overlay stayed up permanently**, on top of the whole page: a dashed border across
  the screen and washed-out content behind it. `hidden` is an attribute whose effect comes from the
  browser's default stylesheet, and any class setting a `display` beats it — `.dropzone{display:flex}`
  cancelled it. A general rule now neutralises every hidden element, and a check lists the template's
  hidden elements that relied on the default stylesheet alone. The existing test read the node's
  `hidden` property, which was indeed `true`: only the computed style could tell.
- **That was not the only way it got stuck**: it counted drag enters and leaves, and a file dropped
  outside the window emits no leave. It now fades for want of a signal — hovering emits `dragover`
  for as long as it lasts.

---

## 1.11.0 — 13 November 2026

### Added

- **Setlists.** A song needs several presets — the bass, the Reaper chain, the pedalboard — and it
  is the song you announce on stage. So a setlist is an **ordered list of songs**, not of presets.
  Opening one shows only its songs, in its order; printing it gives the gig's booklet, in playing
  order. The tab counts follow: announcing "68" above a list of four would be wrong.
- **Dropping a `.RfxChain` on the page makes it a preset.** Importing used to mean opening a Reaper
  preset, entering its editor, then finding the button. The preset takes the file's name, the tab
  switches to Reaper, and it is dated.
- **An order inside sections**: "By name" or "Last edited", in the list bar. It applies inside
  "Others" too — otherwise that would be the one place where it did not.
- **A last-edited date per preset**, written on save and on copy, never on read. It reads at the
  bottom of the card and it prints. Without a date, a preset sorts last: "never saved since the date
  existed" is not "old".
- **Keep the screen awake**, in the menu. In rehearsal, the phone goes dark while you read your
  settings. Where the API does not exist, the button does not appear: better to promise nothing than
  to promise what cannot be held.
- Presets collapse like sections and chain links. Collapsed, a preset is one line carrying its name,
  its family and what it hides. Measured on "Crossfire": 557 px expanded, 65 px collapsed.
- `?group=` accepts `artist` and `tag`; `?sort=` accepts `nom` and `maj`.

### Fixed

- **The Fender Deluxe Active Jazz Bass had its EQ the wrong way round.** Fender's factory diagrams
  013-6700 and 013-6760 give the plate's real order: volume, pan, then a stacked knob — **Treble on
  top, Bass lower** — and Mid last on its small knob. You were turning the wrong knob while reading
  your own preset. Only the display changes: the keys stay put, no preset already written is
  touched. The note now also carries what the diagrams say and nobody guesses: **the blend turns
  clockwise towards the neck pickup**.
- The translation audit could not read a parenthesis: it cut the call at the first ")", so messages
  containing "({0})" escaped it. 59 messages audited before, 75 now.

---

## 1.10.1 — 13 November 2026

### Fixed

- **Nothing showed that a section or a link opened.** The chevron was nine pixels, in the colour of
  secondary mentions and without an outline — and on a phone nothing hovers, so no clue was left.
  In its place, a square box carrying **+** or **−**, the sign everyone reads without instructions.
  The sign comes from the stylesheet and follows `aria-expanded`, so a click still has a single
  attribute to flip.
- **A collapsed link says what it keeps behind it** — "6 bands", "15 settings", aligned right. A box
  that opens onto the unknown is no invitation to open it. The mention goes away as soon as the link
  is open, and on paper, where everything is reopened already.
- Hovering a section or link heading now says so.

---

## 1.10.0 — 13 November 2026

### Added

- **Chain links collapse.** One click on a link's heading, and "Collapse all" for the whole chain.
  Measured on the "All Star" chain: **1,230 px expanded, 214 px collapsed**, and the Reaper tab
  drops from 2,892 to 1,110 px. The heading keeps the number, the plugin, its role and the "out of
  circuit" mark: what you need to find the right link before opening it. As with sections, printing
  reopens everything.
- **Two more groupings: by artist and by style.** Both existed as filters without ever being able
  to lay out the page. What has neither goes to the end under "No artist" or "No style", never
  under "Others": unlike a gear name, an artist's name is written nowhere else on the card.
- `?group=` accepts `artist` and `tag` alongside `kind`, `brand` and `song`.

### Changed

- **The list bar counts presets and their appearances.** By style, a preset carrying two styles
  appears under both — which is what a style is for. Announcing "2 presets" above six cards would
  have looked like a bug: it writes "2 presets · 6 appearances" as soon as the two numbers differ.

### Fixed

- Collapsing a section recounted the document's cards to rebuild the list bar. That was right as
  long as a preset appeared once; the last render now keeps its own figures.

---

## 1.9.0 — 13 November 2026

Measured before and after, on the shipped library: **328 px of chrome before the first preset on a
desktop, 237 now; 569 px out of 812 on a phone, 401 now**. The whole page drops from 21,242 to
15,158 px, and to a single screen when everything is collapsed.

### Changed

- **The header is down to two controls.** Nine identical grey buttons sat there — Gear, Backup,
  Shared, Install, Accounts, Sign out, FR, EN, New preset — while only one creates content.
  Everything about the session and the settings moves behind a menu carrying the account name; "New
  preset" stays on its own.
- **One toolbar instead of two.** Search comes first and takes the width: it was the fastest tool and
  the quietest. "By gear / brand / song" is not a filter but a sort — it becomes a "Group by" list.
- **Filters are picked from lists, no longer from a wall of chips.** The panel lined up 76 of them.
  The lists carry each entry's count, and what you keep stays as chips — two or three, not
  seventy-six. Multiple choice is preserved, and there is no "Apply" button: filtering is immediate,
  a button would only make it slower.
- **A heading above a single preset teaches nothing.** "By gear" produced 25 headings, 20 of them
  over a single card that already named the gear. Lone presets gather under one "Others" at the end:
  25 sections become 7. Not under "By song", where the heading is the information.

### Added

- **Sections collapse.** One click on the heading, and "Collapse all" for the whole list. The state
  is kept from one visit to the next on this machine. Printing reopens everything: a sheet missing
  the sections you had closed on screen would be wrong without saying so.
- The list bar says **how many presets are shown**.

---

## 1.8.0 — 13 November 2026

Checked on a real Reaper chain — ReaEQ, TSE BOD, ReaEQ, MCompressor, bypassed MTuner — read by
Presetbook then written back, both ways.

### Added

- **Crossfire, by Stevie Ray Vaughan & Double Trouble, in the shipped catalogue**: the full Reaper
  chain, and the matching Fender Deluxe Active Jazz Bass setting, tuned a half step down. A preset
  that never saw the original file regenerates the same settings, effect by effect.

### Fixed

- **Importing then exporting a chain gives the file back unchanged.** Every effect was rewritten
  from the preset, even untouched; an effect where nothing moved now leaves with its original bytes.
- **An MCompressor or MTuner assembled here carries everything the plugin writes itself**: the
  compressor was missing two attributes and the tuner its detection mode.
- **A Jazz Bass balance reads N / B**, neck and bridge, instead of a P/J bass's P / J — nothing changes
  for the Yamaha.
- `tools/rfxchain-import.js` shows the settings read from a Melda plugin instead of announcing a
  binary block.
- **The server no longer opens its port before it is ready.** The admin and demo accounts are built
  with scrypt, which is slow on purpose; meanwhile `/healthz` already answered "ok". On a loaded
  machine the window lasted long enough for a request to slip in and be refused. An orchestrator
  waiting on health now waits for the right thing.

---

## 1.7.0 — 12 November 2026

### Fixed

- **A rewritten chain is readable by Reaper again.** Each effect's header announces the size of its
  state; Presetbook copied it from the template without recomputing it. A four-band ReaEQ therefore
  left with "238 bytes" announced for 156 real ones, and Reaper read past the end. The size is now
  rewritten every time, and a test checks it on a ReaEQ, a TSE BOD and a Melda chain. The flaw hit
  any chain assembled by hand — not those coming back from an import untouched.
- **A ReaEQ assembled here carries the end of its block**, the thirty-two bytes that follow the
  bands. Chains built from scratch were missing it.

### Added

- **The three free MeldaProduction plugins: MCompressor, MSaturator and MTuner.** Their state was
  only a binary block kept as is; it is in fact a named, compressed tree. Threshold, ratio, attack,
  release and RMS length for the compressor; input and output gain, dry/wet and clipping for the
  saturator. A chain containing them now exports instead of being refused.
- Settings whose key has not been read — saturation mode, analog amount, compressor knee — **travel
  back with the chain** instead of being lost: they are set in Reaper.

---

## 1.6.0 — 31 August 2026

### Added

- **The Fender Deluxe Active Jazz Bass in the shipped catalogue**, from the maker's own spec sheet:
  master volume, blend, and a three-band active EQ detented at flat. It is the active counterpart of
  the Jazz Bass already shipped — two volumes on one side, volume and blend on the other, and that is
  exactly what separates them.

---

## 1.5.0 — 31 August 2026

### Added

- **The Squier Rascal Bass HH in the shipped catalogue**, described from its front panel: two
  humbuckers, a three-way selector, one volume, one tone, and nothing else — it is passive. It is the
  first model to use the selector type for what it was made for.

---

## 1.4.0 — 31 August 2026

Reported while trying to describe a Squier Rascal HH: two volumes do not suit a bass that has a
selector, and creating your own panel meant leaving the preset you were writing.

### Added

- **A "selector" control type**, with named positions: *Neck / Both / Bridge*, a channel, a
  frequency. The preset stores the position's **name**, not its rank — readable in an export, and
  immune to a reordering. On a card it reads as a label, because you pick a position, you do not dial
  it.
- **Two templates for two-pickup instruments**: *3-way selector* for models that choose, *blend
  control* for those that dial continuously.
- **Creating or duplicating a panel from a preset's editor.** It was possible, but only from the
  *Gear* screen — that is, far from the moment you notice one is missing. *Duplicate this panel* is
  the shortest route: you start from the closest one and correct what differs. Once saved, you are
  back in the preset you were writing, with the new panel already chosen.

### Changed

- **Two workarounds replaced by real selectors.** Lacking this type, the Ampeg SVT-CL's *Mid Freq*
  and the Boss Katana's *amp type* were 1-to-5 scales, with the mapping spelled out in a note. They
  now carry their real names — *450 Hz*, *Crunch*. A preset saved with the old number falls back to
  the default position rather than breaking.

---

## 1.3.0 — 30 August 2026

### Added

- **"Open in my mail app"**, beside a prepared invitation. The button opens whatever mail software is
  already set up on the machine — Thunderbird, Outlook, the phone's own — with the recipient, the
  subject and a complete message: the link, the fact that it works only once, that it expires in a
  week, and that the person will choose their own password. All that is left is to send it.

  It is a plain `mailto:` link, so **the app gains no dependency and still sends nothing itself**: it
  writes, the client sends. The body is encoded with CRLF as the specification requires — with plain
  line feeds, some clients glue the paragraphs into one block.

---

## 1.2.1 — 30 August 2026

### Fixed

- **An environment setting could have no effect at all, without a word.** The `ALLOW_REQUESTS`,
  `ALLOW_REGISTER` and `SECURE_COOKIES` switches were compared without trimming the value: a `.env`
  file saved with Windows line endings yields "1\r", and "1\r" is not "1". You added the line, you
  restarted, and nothing moved — with nothing to say why. Values are now trimmed, `on`, `true`,
  `oui` and `yes` are accepted like `1`, and `0`/`false`/`non`/`off` close explicitly.

### Changed

- **Startup says what it understood.** The server log announces the state of the account-request
  form, next to the state of account creation. And a value that is present but not recognised is
  reported plainly — better one line in the log than half an hour hunting a mistake you did not make.

---

## 1.2.0 — 30 August 2026

The version that looks after first contact. The link has been public since it was posted on a forum,
and the visitor's path was a dead end: they tried the demo, took a liking to it, and had nowhere to
ask for more.

### Added

- **An "Ask for an account" button on the sign-in screen.** The visitor leaves a username they would
  like, an address and, if they feel like it, a word about themselves. Next time the administrator
  signs in, a banner tells them and a badge counts the requests on the *Accounts* button. Beside each
  one, *Prepare the invitation* builds the link and reminds them of the address to send it to.

  **The app sends nothing**: it has no dependencies, so no mail client, and sending stays a human
  move. That is also what stops a sending server from being hijacked by whoever finds the form. The
  address is used for nothing else and goes away with the request as soon as it is dismissed.

  Closed by default: `ALLOW_REQUESTS=1` opens it. A private instance has no reason to expose an
  unauthenticated write endpoint — and when it is open, it is held: three requests per IP address per
  day, fifty pending at most, and the same address twice is accepted without adding anything, because
  answering "already requested" would tell a stranger who has written there.
- **A sentence saying what Presetbook is**, on the sign-in screen. The kicker line was enough for
  someone who had just read the post that led here; not for someone handed the link second-hand.

### Changed

- **The demo is described more accurately.** It announced a reset "every time the server restarts",
  keeping quiet about what matters to the visitor: it resets **when they arrive** if nobody has
  touched it for half an hour. So they find a clean screen, not a stranger's experiments. The screen
  also points out that "Backup" hands them what they made as a file, to bring into a real account.

### Fixed

- **The administration sections only appeared after a reload.** The session read at startup is an
  anonymous one; signing in did not read it again, so the app did not know that this account
  administers the instance. The accounts screen therefore opened without the list of accounts,
  without the invitations, without anything — until you reloaded the page.

---

## 1.1.0 — 29 August 2026

The version that opens the app up to more than one person. Until now everyone kept their presets to
themselves; you can now publish one, invite someone, and make mistakes without consequence.

### Added

- **A shelf shared between the accounts on a server.** A card's *Share* button offers the preset to
  the other accounts, *Shared* opens what others have published. What is published is a frozen copy,
  not a link: editing your preset changes nothing for those who copied it. The copy carries your own
  front panels, otherwise the preset would be unreadable on the other side. Past half a dozen
  presets, a search field appears above the shelf.
- **Single-use invitation links.** The administrator makes a link, hands it to whoever they choose,
  and that person picks their own username and password. The token is stripped from the address bar
  as soon as it is read: it would otherwise end up in history and in screenshots.
- **A safety net.** A deleted preset goes to a bin and stays there for thirty days, deletion can be
  undone from the banner in one click, and one state per day is kept so you can go back. A notebook
  where a page can be wiped by accident is no longer a notebook.
- **Comparing two presets**, differences marked, so you can see what separates two neighbouring
  settings.
- **Filtering and grouping by brand.** Brand paints with a broad brush, the model is precise. It does
  not appear when the view holds a single brand: offering a choice of one teaches nobody anything.
- **Some twenty named models in the catalogue**, and not a line of code for any of them — bass amps
  (Ampeg SVT-CL, Markbass Little Mark, TC Electronic BH250, Fender Rumble 500), guitar amps (Fender
  Blues Junior, Vox AC30C2, Marshall DSL40, Boss Katana 50), instruments (Fender Precision and Jazz
  Bass, Music Man StingRay, Ibanez SR) and seven named pedals alongside the generic types.
- **Suggestions while typing a name**, so the same preset is not written twice. From the second
  letter, close presets appear; a name already taken is flagged more firmly. Clicking a suggestion
  opens the existing preset, and the banner brings back what you were typing.
- **The documentation in English**, all three parts, plus an installation guide for a Mac aimed at
  people who never open a terminal.

### Changed

- **Search no longer rebuilds the whole list on every keystroke.** Measured: about 2.4 KB of HTML per
  card, so over a megabyte per keystroke on a library of five hundred presets. A 150 ms delay is
  enough; six rapid keystrokes now produce a single render.
- **The demo resets** when a newcomer starts it after a long idle period, so they do not land on
  somebody else's screen.

### Fixed

- **Creating the first account failed** on a fresh instance, with "This invitation is no longer
  valid" when no invitation was involved at all. The page declared the same variable name twice: the
  invitation token and the browser's install prompt were one and the same. On any public deployment,
  the install event ended up being sent as an invitation.
- **An invitation was consumed before the form was validated**: a password that was too short burned
  a single-use link, leaving the invited person facing a dead link without ever having an account.
- **A dubious token closed a door that was open anyway**: the three other conditions for opening are
  now tested first.
- **A corrupt accounts file took the last good copy with it.** The backup was overwritten by the
  unreadable file; that file is now set aside and the backup left intact.
- **The sign-in error message stayed in French** on an English page, the only one of four such
  displays that did not translate.

---

## 1.0.0 — 28 August 2026

The first public version: the app, the accounts, and what it takes to run it yourself.

### Added

- **The notebook itself.** A single self-contained page that files presets for an instrument, an amp,
  a pedal, a whole pedalboard and Reaper plugin chains. Each preset is shown the way you would read
  it off the gear: in clock hours for a knob detented at noon, on its own scale for a graduated knob,
  with the plugins' real parameter names.
- **Declarative registries rather than per-model code.** A front panel is described — its knobs, its
  modes, which controls leave the circuit — and the interface follows. You create your own gear, down
  to drawing a pedal, without touching the code.
- **The Laney Lionheart L20T-112 guitar combo**, the first proof that the registry is not bass-only:
  two channels sharing the EQ, a global Tone, a drive channel that greys out its own controls when
  switched off. Not a line of code was added for it.
- **A public demo account**, enabled by `DEMO_LOGIN`. Its credentials being public, it is held apart
  on four points — it notably cannot create accounts, which would have handed that right to the whole
  internet.
- **Filtering by gear and by style, and printing.** The sheet holds exactly what is on screen,
  filters included, with a header line saying what it contains.
- **An app usable on a phone and installable**, which opens with no network.
- **Password changes** by each person, plus a rescue tool from the machine for a forgotten one — no
  one can change someone else's over the web.
- **An administrator**, who is the first account created on the instance. An ordinary user can only
  change their password and delete their own account.
- **gzip compression**: the page is 198 KB, and 58 KB on the wire.
- **Importing and exporting Reaper `.RfxChain` chains**, with two fidelity rules — an unchanged value
  is written back with its original float, and export refuses by naming the offending plugin rather
  than inventing anything.

### Fixed

- **The page had no `viewport` tag.** A phone rendered it in a 980 px virtual window and then shrank
  the lot — readable with a magnifying glass. Measured afterwards at 390 px: 118 px of horizontal
  overflow, caused by the tab row not wrapping.
- **Search ignored accents in one direction only.** "pedalier" found nothing where "pédalier" found
  two presets — on a phone, where nobody types accents, it looked broken half the time.
- **The administrator role went to the wrong account.** It was assigned by creation date, and an
  account without that date sorted ahead of every other.
- **The demo switched itself on**: the `.env` template shipped `DEMO_LOGIN` active, so copying it
  opened a public account on your private server without you meaning to.
