# Using Presetbook

*[Version française](utilisation.md)*

Presetbook keeps settings: those of an instrument, an amp, an effect pedal, a whole pedalboard, and
the plugin chains of a recording program. A preset describes one complete setting, and shows it the
way you would read it on the gear — not on some abstract scale.

The shipped catalogue is a bass player's, but the tool is not: a front panel is **described**, not
coded. Guitar, keys, a synth, a drum machine — any gear with knobs belongs here, and [Gear](#gear)
explains how to declare it.

## The five kinds of preset

| Kind | What it holds |
| --- | --- |
| **Instrument** | the chosen gear, its modes, the pickup blend, the EQ, right-hand technique, strings |
| **Amp** | the chosen gear, gain, character switches, the drive channel, the EQ |
| **Pedal** | the chosen effect and its settings, with the enclosure drawn |
| **Pedalboard** | pedals in signal order, each with its settings and its state |
| **Chain** | tempo, tuning, and the plugins in order, with their real parameters |

Any preset can be attached to a **song** (title and artist). That is what gathers the bass, the amp
and the chain of one cover in a single place.

## The main screen

Top right, next to the title:

- a **storage pill** telling you where your changes are saved — see below;
- the **signed-in account** and its sign-out, in a self-hosted deployment;
- **Accounts**, to change your password or delete your account — and, for the administrator, to open
  an account and manage the others. See below;
- **Gear**, to manage front panels;
- **Backup**, to export or restore;
- **New preset**;
- right in the corner, under a small globe, the **language**: `FR` or `EN`.

The **footer** stays pinned to the bottom of the screen as you scroll: it carries the licence, the
"free of charge" statement, and the support link.

Just below, the sorting bar:

- the **tabs** All, Bass, Amp, Pedal, Pedalboard, Reaper, each with its preset count;
- the **search**, which looks at the name, the notes, the styles, the song, the artist, the gear
  name, the pedals of a pedalboard and the plugins of a chain. It ignores case **and accents**:
  `pedalier` finds "Pédalier", which matters when you are typing on a phone. The list is rebuilt a
  fraction of a second after you stop typing rather than on every keystroke, which keeps the field
  responsive even with a large library;
- the **grouping**, by gear or by song;
- the **filters**, by gear model and by style — see below;
- **Print**, which puts what is displayed onto paper.

## On a phone, and offline

The app adapts to a pocket screen: rows wrap, touch targets grow, fields go to 16 px so that iOS
stops zooming into them, and the footer shrinks to the licence and the support link so it does not
eat the screen.

It **installs**: on Android an **Install** button appears in the header as soon as the browser offers
it; on iPhone it is *Share → Add to Home Screen*. It then opens in its own window, without an address
bar, with its icon.

Once installed it **opens with no network** — verified with the server stopped: the whole catalogue
still renders. Be clear on what that means, though: offline you see the last version loaded, and your
**changes do not reach the server**. The storage pill turns orange or red, and backing up is on you.

The opposite is true too, and it is deliberate: **online, the app never serves a cached version.** The
service worker goes to the network first and falls back on its copy only when the network does not
answer. An update therefore shows up on the first reload, with nothing to clear — the opposite of the
usual reflex, and the reason is to avoid running a stale version without knowing it.

## Comparing two presets

**Compare**, on a card, puts two presets side by side and **marks the rows that differ**. The
dropdown at the top picks the second one, among presets of the same kind. The number of differences
is announced before the table: *4 differences*, or *Settings are identical*.

The values shown are the cards' own, read by the same functions — a comparison saying something other
than what you see would be worthless.

What is **not** counted as a difference:

- a control **out of circuit on both sides** — two `—` are not a difference;
- a control **not on the other panel**, when the two presets do not share the same gear. It stays
  listed, with a "not on the other panel" note, but comparing a Contour that does not exist elsewhere
  would be a false difference. The change of gear itself is flagged at the top.

Each kind compares in its own way: an instrument or an amp control by control, **a pedalboard slot by
slot** — signal order makes a pedalboard as much as the settings do — and a chain link by link. Two
different kinds have nothing to confront, and the screen says so.

## Sharing a preset with the other accounts

In a self-hosted deployment, the **Share** button on each card offers your preset to the other
accounts on the server, and the **Shared** button in the header opens the common shelf: what others
have published, each with **Copy to my library** beside it.

Three things to understand, one sentence each:

- **what is published is a frozen copy**, not a link. Editing your preset changes nothing for those
  who already copied it, nor for what the shelf displays — re-publish to update it;
- **the copy carries your own front panels.** A pedal you drew travels with the setting that uses it,
  otherwise the preset would be unreadable on the other side;
- **copying is copying.** The preset becomes yours, you edit it without touching the original, and
  copying twice gives two presets rather than overwriting the first.

You remove your own presets from the shelf whenever you like; the administrator can remove any of
them, which is what makes moderation possible. A deleted account takes its publications with it — a
preset signed by a name that no longer exists has no business being there.

As soon as the shelf holds more than half a dozen presets, a search field appears above it: it looks
at the name, the author and the family, ignoring case and accents just like the catalogue one. Below
that count it would have nothing to filter and would only take up room.

The demo account does not publish: its credentials being public, that would open the shelf to the
whole internet.

## Filtering

The **Filters** button opens three lists of chips: **Brand**, **Gear** and **Styles**. Clicking a
chip activates it, clicking again removes it, and the button shows how many filters are in play.

Brand comes first because it paints with a broad brush: it gathers every model from the same maker,
where gear targets one precise model. It does not appear when the view holds a single brand —
offering a choice of one teaches nobody anything.

The rule is the one you expect: **several choices within one list add up** (Laney *or* Rumble), **the
two lists intersect** (a Laney *and* blues). The number on each chip accounts for the other filters
already set, without counting itself — which is what stops you clicking a choice that returns
nothing.

Filtering on a **pedal** also brings back the **pedalboards** that use it: that is the right way to
find where a given effect earns its place.

The sorting bar at the top follows the same idea: **By gear**, **By brand** or **By song**. A
pedalboard mixes the brands of its pedals and a Reaper chain has none — those are plugins: both are
filed under their family rather than split apart.

Six URL parameters are read at load time, so a view can be bookmarked or sent to someone:
`?q=motown`, `?kind=bass`, `?group=song|brand|kind`, `?gear=lionheart20,rumble40`,
`?brand=Ampeg,Vox` and `?tag=blues,rock` — the last three as comma-separated lists. A seventh,
`?edit=<id>`, opens one preset directly.

## Printing

The **Print** button sends **exactly what is on screen** to paper: the same presets, in the same
order, filters included. Everything you cannot click on a sheet disappears — header, sorting bar,
filter panel, card buttons, footer.

At the top of the first page, one line says what the sheet holds: the title, the active filters, the
preset count and the date. A sheet found later in a gig bag still makes sense.

Two details that matter:

- **the dark theme is forced to light** when printing. Printing a black ground wastes ink and makes
  the dials unreadable;
- **the dial fills are kept.** Browsers drop background colours when printing by default, which would
  erase the markers — and a dial without its marker says nothing at all. The stylesheet forbids that
  explicitly, so leave "background graphics" ticked if your browser asks.

A preset is **never cut across two pages**. On A4 the layout falls to two columns.

## Language

The `FR` / `EN` button, right in the top-right corner under a small globe, switches the whole
application, catalogue included: preset names, notes, control labels and pedal families are
translated, but **proper names never are** — "Yamaha BB734A", "ReaComp" or "TSE BOD" stay as they are,
as do song titles and artists.

Two details follow the language: the decimal separator (`6,5` in French, `6.5` in English) and the
way EQ hours are written (`12 h 30` against `12:30`). Search, on the other hand, accepts both
languages whichever one is displayed: `rehearsal` and `répétition` return the same presets.

Your choice is remembered with your data, so it follows you from one machine to another on the same
account. On a first visit the browser's language decides; `?lang=en` or `?lang=fr` in the URL wins,
which lets you share a link already in the right language.

## Reading a preset

A card shows the gear concerned, the states that are not dials (mode, blend, switches) as labels,
then the dials **in the order of the front panel**.

Two ways to read a dial, depending on the gear:

- **in clock hours**, for a knob with a centre detent like the Yamaha BB734A's: noon is the neutral
  notch, where the knob does nothing. One hour is one notch of correction, and the display goes down
  to a quarter notch — `12 h 15` is a real position, not a rounding;
- **on its own scale**, for a graduated knob like the Fender Rumble 40's 1 to 10. Decimals follow the
  knob's step.

Two special readings:

- **`—` and a dimmed dial**: the control is out of circuit in the current state. On the BB734A in
  passive mode the EQ leaves the circuit; on the Rumble, Drive only matters if the overdrive is
  engaged;
- **"à régler"** (set it by ear): the value has no number. That is the case for a compressor
  threshold, which you bring down until you get the reduction you want.

The pickup blend is shown as a percentage of travel, `P 45 / J 55`, because that is how you read a
balance control — not in rough steps.

## Editing a preset

**Edit** opens the editor. At the top, the name, the styles, the song and the artist. Below, the
**Front panel** block: the chosen gear, a note on its particularities, then its controls. Sliders
show their value in the gear's own unit while you move them, and a control that is out of circuit is
greyed rather than hidden — so you know it exists.

From the second letter typed into the **name**, close presets appear right below it. A library
always ends up holding two "Motown doux" written six months apart, and the moment to notice is while
you are typing the name. A name already taken is flagged more firmly than mere neighbours.

Clicking a suggestion opens the existing preset, which is usually what you meant to do. What you were
typing is not lost for that: the banner brings it back in one click.

Matching happens at the **start of a word**: "motown" finds "Compression Motown", but "zz" does not
drag in every Jazz and Fuzz in the library. The **Song** field works the same way and offers titles
already entered, artist included — a title should be spelled one way.

**Duplicate** makes an editable copy, which is the right way to start from a catalogue preset.
**Delete** asks for confirmation with a second click.

Changing gear midway keeps the values whose controls exist on both sides and fills the rest with the
new model's defaults, erasing nothing.

## Gear

The **Gear** button opens the list of front panels, each with its control count and the number of
presets using it.

The **shipped** panels cannot be edited. You **duplicate** one to start from a base. They cover
some twenty named models — bass amps (Ampeg SVT-CL, Markbass Little Mark, TC Electronic BH250,
Fender Rumble 40 and 500), guitar amps (Fender Blues Junior, Vox AC30C2, Marshall DSL40, Boss
Katana 50, Laney Lionheart L20T-112), instruments (Yamaha BB734A, Fender Precision and Jazz Bass,
Music Man StingRay, Ibanez SR) and a few named pedals — plus generic templates for everything else.

The Lionheart shows in passing what the registry can do without code: two channels sharing the EQ, a
global Tone, a drive channel that greys out its own controls when it is off, and a look of its own —
white knobs with blue markers on a stainless panel, the marker turning red when the drive channel is
engaged.

Creating a panel asks for a model, optionally a brand, the knob appearance, then the controls in
order. Each control has a label and a type:

| Type | For what |
| --- | --- |
| Detented dial | a knob neutral at the centre, read in hours |
| Bounded scale | a graduated knob, 1 to 10 for instance |
| Blend | a balance between two pickups |
| Switch | a push button or a two-state selector |
| Vertical slider | a graphic EQ band, in decibels |

Two mechanisms make a panel faithful without code:

- **two modes**, the second of which can put some controls **out of circuit** — that is how the
  BB734A's passive mode works;
- a control that **only matters if** a switch is engaged — the Drive of a saturated channel.

A panel used by presets cannot be deleted: the interface says how many hold it.

## Pedals and pedalboards

A **pedal preset** holds the settings of one effect. The pedal is drawn with its knobs at the set
position, then the values are repeated as figures just below — the drawing to recognise it at a
glance, the figures to reproduce it.

A **pedalboard** is a run of pedals in signal order, each with its own settings and an **in circuit**
checkbox. A bypassed pedal stays visible, greyed, with its LED dark: that is useful information, not
a blank.

The shipped families cover the essentials: boost, overdrive, distortion, fuzz, preamp and DI,
compressor, noise gate, graphic EQ, octaver, envelope filter, chorus, phaser, flanger, tremolo,
delay, reverb, bass synth, tuner. Each carries the **conventional control set of its family** — an
overdrive has Gain, Tone and Level; a flanger has Manual, Depth, Rate and Res — and not the settings
of one particular commercial model.

### Building a pedalboard

**Edit** on a pedalboard gives the list of slots. For each: the chosen pedal, its role in the chain,
the in-circuit box, arrows to move it, and **its settings right there**. Changing the pedal in a slot
resets the settings to the new family's, since its knobs are not the same.

Order matters as much as the settings, and that is the whole point of a pedalboard: the compressor
before the envelope filter, otherwise the filter's sensitivity follows the level swings of your
playing instead of following the attack.

### Drawing your own pedals

The drawing is not an image: it is **derived from the panel's description**. Creating a pedal from
**Gear** therefore gives you its enclosure with no extra work, and the form shows a **live preview**
that follows every change.

Three settings decide the look:

| Setting | Effect |
| --- | --- |
| **Enclosure colour** | freely chosen; the text colour adapts to stay readable |
| **Silhouette** | standard box, treadle, tall and narrow, large box, mini |
| **Knobs per row** | 1, 2, 3, 4, or whatever the silhouette prefers |

The silhouettes are **formats, not brands**: each matches a common enclosure on the market. The
treadle carries a large foot control taking up the bottom of the box; the mini does not print its
name, for lack of room; the large box leaves margin around the knobs.

The number of knobs comes from the declared controls, their layout from the knobs-per-row. **An
incomplete row is centred**: three knobs therefore sit two on top and one below in the middle, as on
most three-knob pedals.

## Plugin chains

A chain preset lists the plugins in signal order. Each link carries its role, an **in circuit** box —
a plugin left out of circuit stays documented without counting in the chain — and its parameters as
its own window names them.

Known plugins show their real parameters, with their units and bounds. ReaEQ shows its bands as a
table: type, frequency, gain, bandwidth. An uncatalogued plugin is described in free text.

### Importing and exporting a Reaper chain

The **Export as .RfxChain** button is right on a chain's card, next to **Duplicate**: no need to open
the editor. The editor additionally offers **Import a .RfxChain**, at the bottom of the "Reaper
chain" section. The exported file goes into Reaper's `FXChains` folder, and shows up in the FX
browser, *FX Chains* tab.

Those two buttons only appear in a **self-hosted deployment**: the codec is a separately served file,
absent from the published page. If you cannot see them, you are looking at the published mirror
rather than at your server.

There are three exports, not to be confused: **Export** on a card gives *that preset* as JSON,
**.RfxChain** on a chain card gives a file *for Reaper*, and **Backup** at the top gives *the whole
library* as JSON.

Export does **not** require a prior import: a chain assembled by hand here writes out too, for the
five plugins whose format is established — TSE BOD, ReaEQ, ReaComp, ReaVerbate and the saturation
JSFX. A plugin outside that list makes the export **refuse, naming it**, rather than writing an
invented state.

Not everything in a chain file can be read the same way:

| Plugin | What can be done here |
| --- | --- |
| TSE BOD | everything is editable: its state is named XML |
| ReaEQ | bands fully editable |
| ReaComp, ReaVerbate | editable: their parameters have been established |
| JSFX | the first slider is read, the others preserved |
| Other plugins | **preserved byte for byte**, but not editable here |

Two safeguards. An effect whose values you did not change is rewritten **identically**: no display
rounding creeps into a setting you never touched. And the export **refuses** rather than inventing:
on ReaEQ, only three band types have an established equivalent in the file, so the others are chosen
in Reaper — imported here, they are preserved and rewritten unharmed.

## The catalogue and your data

Presetbook ships with a starting catalogue of settings. It is part of the application, so it grows
with it. **Your creations and your edits live separately.** Three useful consequences:

- growing the catalogue never destroys your work;
- a catalogue preset you have edited can be put back to its original value;
- a deleted catalogue preset is hidden, not destroyed: resetting brings it back.

**Backup** exports the lot as JSON — the catalogue as displayed plus your changes. The block can be
copied, downloaded, and pasted back to restore. The same screen offers to reset your changes, which
restores the original catalogue without touching the presets you created.

### Exporting a single preset

The **Export** button on each card writes a `.presetbook.json` file holding that preset only — to
archive it, pass it on, or move it from one server to another. It works for all five kinds, unlike
the `.RfxChain` export which only makes sense for a plugin chain.

The file **carries the front panels the preset needs**, if they are yours: a pedal you drew travels
with the pedalboard that uses it, otherwise the preset would be unreadable on arrival. Shipped
panels are not copied, since they already exist on the other side.

To take it back in: **Backup**, paste the file into the block, then **Restore**. A single preset is
**added** to the library instead of replacing it — the file's contents decide, so there is no
separate button to confuse. If the preset is already there, the new one gets a fresh id and its name
receives *(imported)*, so you can compare before choosing. And if a panel is missing, the import is
**refused, naming it**, rather than adding a preset that could not be displayed.

## If you delete something by mistake

Three nets, from the most immediate to the most distant.

**The confirmation message carries "Undo".** It stays eight seconds: that is the moment you realise
your mistake, and that is where the button has to be.

**The trash.** A preset you created waits there **30 days**, with the front panels it depends on — a
pedal you had drawn comes back with it. It lives in **Backup**, and it travels with your data: a
preset deleted from the phone is recovered from the computer. A preset from the **shipped catalogue**
does not go through it: deleting one only hides it, which "Reset my changes" already undoes.

**Earlier versions**, in a self-hosted deployment. The server keeps **one state per day for a week**,
and **Backup** lists them with each one's preset count. That is what catches the rest: an unfortunate
restore, a bulk edit, a mistake you only notice the next day.

A day's snapshot freezes the state **at the first save of that day** — so the previous evening's. That
is exactly what you want in order to go back one day; within a single day, the first two nets are the
ones that play. And going back to a version photographs the current state first: that move is
reversible too.

## Where your changes are saved

The pill at the top right says so at all times:

| Colour | Meaning |
| --- | --- |
| **Green** | durable storage — a Presetbook server, or the published page |
| **Orange** | this browser only, or a session to reopen |
| **Red** | no storage: export before closing |

In a self-hosted deployment each account has its own presets. On first open no account exists: the
first one created is yours, it becomes the instance's **administrator**, and any presets already
saved are attached to it. Account creation then closes by itself — only the administrator can open
another one, or send an invitation link.

There is **no password recovery by email**: a self-hosted server with no mail service cannot offer
one. Keep the password in a password manager.

### The demo account

If the server offers one, the sign-in screen shows **Try the demo**. One click is enough: it is an
account open to everyone, made for looking around without signing up.

Two things to know before storing anything in it. Its presets **go back to zero** when the server
restarts, and also when a visitor arrives if nobody has touched them for half an hour — it is not
storage, it is a sandbox. The idle delay matters: without it, a newcomer's arrival would wipe the
screen of someone in the middle of exploring. And the account **cannot open an account**: its
credentials being public, that right would amount to opening the server to everyone. The **Accounts**
button therefore does not appear in that session, and the pill at the top right is a permanent
reminder that you are in the demo.

To keep your work you need a real account. In the meantime **Export** on a card and **Backup** work
normally: nothing stops you taking away what you made in the demo.

### Who is allowed to do what

Two roles, and a single criterion: **the administrator is the first account created on the
instance.**

| | User | Administrator |
| --- | --- | --- |
| Their presets, gear, backups | yes | yes |
| Change **their own** password | yes | yes |
| Delete **their own** account | yes | no — see below |
| Open an account for someone | no | yes |
| See the list of accounts | no | yes |
| Delete someone else's account | no | yes |

Nobody can change someone else's password, **not even the administrator**: they can delete an
account, they cannot get into it. A forgotten password is reissued from the machine, which leaves a
trace in the server log.

The administrator **cannot delete their own account** from the application: the instance would be
left with nobody able to open an account, and the only way out would be editing `users.json` by hand.

On an instance that existed before this version, the role goes to the **oldest account** at the first
start, and the log announces it.

### Changing your password

The **Accounts** button opens two forms. The first changes **your** password: the current one, the
new one, its repeat. Your **other sessions are closed** in the process — the one making the change
stays open. It is the thing to do as soon as someone has sent you a password in a message.

Nobody can change someone else's password from the application, **not even the administrator**, and
that is not an oversight: they can delete an account, they cannot get into it. Otherwise the role
would grant access to everyone's presets.

The demo account is the exception the other way round: it **keeps** its password, which is public and
displayed. Changing it would shut everyone out until the next restart.

A **forgotten** password is fixed from the hosting machine, not from the application — see
[Installing and running it](installing.md).

### When someone asks you for an account

On a public instance, a visitor who tries the demo and wants more has no way to reach you. The
`ALLOW_REQUESTS=1` setting adds an **Ask for an account** button to the sign-in screen: the person
leaves a username they would like, an address and, if they feel like it, a word about themselves.

Next time you sign in, a banner tells you and a badge counts the requests on the **Accounts** button.
Beside each one, *Prepare the invitation* builds the link and reminds you of the address to send it
to; *Dismiss* removes it.

**The app sends nothing.** It has no dependencies, so no mail client: sending stays your own move.
That is also what stops a sending server from being hijacked by whoever finds the form.

The address is used for nothing else and goes away with the request as soon as you dismiss it. Three
requests per IP address per day, fifty pending at most: this is an unauthenticated write endpoint, it
must not be allowed to swell. Closed by default — a private instance has no reason to expose it.

### Inviting someone

**Administrator only**, and it is the right way to bring someone in. The **Accounts** button offers
*Create an invitation link*: you get a link to pass on, the person clicks, and **chooses their own
username and password**.

Nothing secret travels: you do not know their password, and there is nothing to change afterwards.
The link **works only once** and **expires after a week**. Pending invitations can be revoked with
one click as long as they have not been used.

The link is shown **only once**, at the moment you create it — the server keeps only its fingerprint,
as it does for passwords. If you lose it before sending it, revoke it and create another.

On arrival, the token is removed from the address bar as soon as the page opens: it lingers neither
in the history, nor in a screenshot, nor in a link re-shared by accident.

### Opening an account without a link

**Administrator only.** The **Accounts** button in the header opens an account for someone else:
username, password, and its repeat. **Your session does not change** — the server guarantees it, not
just the screen: an account created by a signed-in user receives no session cookie.

The person then signs in themselves, and their presets are entirely separate from yours. This avoids
opening `ALLOW_REGISTER` on a server exposed to the internet: you create your group's accounts one by
one, without leaving creation open to all comers.

This route only serves when you cannot pass on a link: the password then travels **by hand**, and you
have to remember to tell the person to **change it on first sign-in**. The invitation link avoids all
of that — which is why it is preferable.

## Licence and donations

Presetbook is **free software** under [AGPL-3.0-or-later](../LICENSE), and **free of charge**. Nothing
is limited, nothing expires, no feature waits for a payment — the footer says so, and it says true.

If the tool serves you, a donation is **welcome, never asked for**: <https://ko-fi.com/talva>, or the
floating button at the bottom of the page. It is there to be ignored without consequence.

Free means you may use, study, modify and redistribute the application. The single obligation is
about hosting: **if you serve a modified version to other people, you must offer them your source
code.** At home, for yourself, nothing is asked of you.
