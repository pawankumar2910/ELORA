# elora — Marketing Media (website)

A calm, scroll-driven 3D landing page. One fixed WebGL stage (three.js) is driven by the
page scroll: the camera glides from the landing hero through three departments (Editing, Technical and
Marketing) and the crew, and ends on a contact panel. Each scene has **one** object. The logo (traced from the supplied
artwork) is used as vector in the page, loader and lite version, and extruded into 3D in
the hero, Brand & Social and the finale.

**Look:** ivory paper, navy ink, one royal blue taken from the logo, serif headlines
(Instrument Serif) over clean sans text (Inter), hairlines instead of glows, soft contact
shadows instead of effects. Colours are the `:root` variables at the top of `css/style.css`
and the palette `K.C` in `js/kit.js`.

## Run it

Open `index.html` in Chrome, Edge, Safari or Firefox. It needs an internet connection
(three.js and the fonts load from a CDN). If your browser is strict about local files:

```bash
python -m http.server 5173
```

then visit http://localhost:5173. Any static host works for publishing (Netlify, Vercel,
GitHub Pages, cPanel) — upload the folder as it is.

## Contact → Gmail

The form sends the brief to **growwithelora@gmail.com** by opening a pre-filled Gmail compose window:

| Device | What opens |
| --- | --- |
| Android | the Gmail app (falls back to Gmail on the web if the app is missing) |
| iPhone / iPad | the Gmail app (`googlegmail://`) |
| Desktop | Gmail on the web, in a new tab |

Some in-app browsers (Instagram, Facebook, WhatsApp) block app launches, so a row of
buttons — *Open Gmail app / Gmail on web / Mail app / Copy brief* — appears whenever the
automatic hand-off did not take. The address lives at the top of `js/contact.js` (`TO`) and
in the footer link in `index.html`. Every "Start a project" button scrolls to this form.

## The crew

The ninth stop, "The people behind elora", puts the elora mark in the middle of a ring with six
balls, one per person, each carrying a monogram. The names sit beside it as a list with round
monograms (given name bold, family name light, in Fraunces). The list is pinned by its top edge, so
opening a name only pushes the names below it down; nothing above it moves. Point at a name (or tap it on a phone) and its details
slide down; at the same moment the ring turns that person to the top, their ball swells and turns
blue, and a spoke lights up towards the mark. Click or tap a name to keep it open; click again or
press Esc to close.

| Tap | What happens |
| --- | --- |
| Call row | `tel:` link, so the phone's dialler opens (Android and iPhone) |
| Write row | Gmail opens with a message already addressed to that person (Android: Gmail app, iPhone: Gmail app, desktop: Gmail on the web). If it does not open, a small bar offers Gmail on the web / Mail app / Copy address |
| Portfolio row | opens the website in a new tab (only where a portfolio is listed) |

A soft sound plays as a name opens, closes or is kept open (tones made in the browser, no
audio files). Browsers only allow sound after a first tap or key press, and the **Sound on/off**
switch under the list is remembered.

To change the team, edit the `CREW` list at the top of `js/crew.js` (`first` = given name, shown bold;
`last` = family name, shown light; monogram `ini`, role, phone, email and an optional `portfolio`). The
company Instagram and Facebook (contact panel and under the crew list) open the apps through
`js/links.js`; their ids live in `index.html` as `data-app="ig:growwith.elora"` and
`data-app="fb:61595658505541"`.

## Built to stay smooth on any device

The scenes are deliberately light (about 7,000 triangles and a handful of draw calls on
screen at once, one light, no post-processing, no shadow maps). On top of that,
`js/perf.js` picks a quality level before anything heavy is built, and `js/main.js` watches
the frame time and steps down if a device struggles.

| Level | Device | What it does |
| --- | --- | --- |
| 3 | desktop, strong GPU | up to 2.5x rendering, full-size textures |
| 2 | laptop / integrated GPU | 2x rendering |
| 1 | phones, tablets | 2x rendering, plain materials, 60 fps cap |
| 0 | low-end phones (about 2 GB RAM) | 1.5x rendering, 3/4-size textures |
| lite | no WebGL2, software renderer, or still too slow at level 0 | a light CSS-only page (same copy, same contact form) |

Every level keeps anti-aliasing on, and the logo outline is a smooth sub-pixel trace, so edges
stay sharp. `js/main.js` runs a short speed test behind the loader and starts a slower phone at
a lower resolution instead of stuttering first. While it runs it keeps the frame rate even:
fewer pixels first, then a steady 30 fps, then a lighter level, and it gives pixels back after a
long calm stretch. A low-end phone that is just sitting still drops to 30 fps to stay cool.

How much scrolling each scene takes is set by `MOVE` and `DWS` near the top of the timeline
in `js/main.js` (smaller numbers = a faster page); how quickly the scene follows the scroll is the
`9` in the `S.sp += …` line.

The loader is plain SVG (no WebGL), the render loop allocates nothing per frame, and
animated canvases redraw at 8–20 Hz depending on level.

Test any level in the address bar: `?q=0`, `?q=1`, `?q=2`, `?q=3`, or `?lite=1`.

## What is where

| File | What it does |
| --- | --- |
| `index.html` | All page copy: hero lockup, the chapters of the three departments, the slider, contact panel, shared logo symbols |
| `css/style.css` | Theme, layout, phone layout, low-power and lite styles |
| `assets/` | `logo.svg` (full lockup, for light backgrounds), `logo-mark.svg`, `favicon.svg` |
| `js/logo.js` | The logo geometry (bubble, megaphone glyph, the letters of "elora") used for the 3D versions |
| `js/perf.js` | Device detection and the quality levels |
| `js/loader.js` | The logo-in-a-ring loading screen |
| `js/main.js` | Engine: renderer, light, scroll → camera, text animation, quality control |
| `js/kit.js` | Shared helpers: materials, canvas screens, contact shadows, the 3D logo |
| `js/contact.js` | The Gmail hand-off for the contact form |
| `js/links.js` | App hand-off for Instagram, Facebook and Gmail links (Android / iPhone / desktop) |
| `js/crew.js` | The team list and its slide-down details (edit the `CREW` list) |
| `js/lite.js` | The light fallback page |
| `js/st-hero.js`, `st-crew.js`, `st-finale.js` | The intro, the crew ring and the contact logo |
| `js/st-poster.js` … `st-analytics.js` | The eight stages ("parts") of the three departments |
| `js/st-services.js` | Builds the three departments as camera tours through their stages |

Stations, in scroll order: **intro** (the 3D logo) → **Editing & Design** (a tour: poster → reel
phone → brand) → **Technical** (web page → automation steps → CRM funnel) → **Marketing** (ads
target → analytics bars) → **crew** (the logo with a ring of six people) → **contact**.

A department is one continuous move: its stages stand in a row and the camera flies from stage to
stage as you scroll (`js/st-services.js`), while the headline for each stage rises out of a line.
The slider on the right shows where you are (dots = stations, small ticks = the stages inside a
department) and every dot is clickable. The scroll itself has momentum: the story eases into
motion and eases to a stop.

## Things to check before launch

- **Social links** — only Instagram and Facebook are linked (LinkedIn / YouTube were removed because no links were given). Add more as `<a data-app="…">` or plain links in the `#contact` block of `index.html`.
- **Phones** — the app hand-offs (Gmail, Instagram, Facebook) were checked as generated links in an emulated Android browser; try them once on a real Android phone and iPhone.
- **Copy** — every chapter is a `<section class="chapter">` in `index.html`. The mock-ups inside the scenes use a generic "yourbrand".

## Changing the departments

The three departments and their stages are one line each at the bottom of `js/st-services.js`
(`tour('editing', ['poster','reels','brand'], 2.7)`). Each stage is a "part" (`ELORA.part(...)` in
`js/st-poster.js` … `st-analytics.js`); add a file with a new part, list it in a tour, and add a
matching `<section class="chapter" data-k="…" data-b="…">` in `index.html` (`data-k` = station
number, `data-b` = stage number, `left` / `right` = which side the words sit on). The stage takes
the other side automatically.

Speed of the story is set at the top of the timeline in `js/main.js`: `MOVE` (the glide between
stations), `DWS` (how long each station lasts) and `HOLD` (how much of a stage is spent standing
still). Smaller numbers = a faster page.

## Notes

- Mouse: the scene leans with the pointer; dragging sideways turns the object on stage.
- `prefers-reduced-motion` shortens the intro and calms the camera.
