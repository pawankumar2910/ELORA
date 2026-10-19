# elora — Marketing Media (website)

A calm, scroll-driven 3D landing page. One fixed WebGL stage (three.js) is driven by the
page scroll: the camera glides from the landing hero through eight department scenes and
the crew, and ends on a contact panel. Each scene has **one** object. The logo (traced from the supplied
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

The ninth stop lists the team by name. Point at a name (or tap it on a phone) and the
details slide down: role, phone, email, an Instagram icon and, where there is one, a
**Portfolio** button. Click or tap a name to keep it open; click again or press Esc to close.

| Tap | What happens |
| --- | --- |
| Phone number | `tel:` link, so the phone's dialler opens (Android and iPhone) |
| Email | Gmail opens with a message already addressed to that person (Android: Gmail app, iPhone: Gmail app, desktop: Gmail on the web). If it does not open, a small bar offers Gmail on the web / Mail app / Copy address |
| Instagram icon | Android: the Instagram app (web page if it is not installed). iPhone: the https link, which iOS hands to the app when it is installed. Desktop: a new tab |
| Portfolio | opens the website in a new tab |

To change the team, edit the `CREW` list at the top of `js/crew.js`. The company Instagram
and Facebook (contact panel and crew panel) use the same app hand-off; the ids live in
`index.html` as `data-app="ig:growwith.elora"` and `data-app="fb:61595658505541"`, and the
hand-off code is `js/links.js`.

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
stay sharp. While it runs, `js/main.js` keeps the frame rate even: a phone that cannot hold
60 fps settles at a steady 30 fps, then renders fewer pixels, then drops a level, and gives the
pixels back after a long calm stretch.

The loader is plain SVG (no WebGL), the render loop allocates nothing per frame, and
animated canvases redraw at 8–20 Hz depending on level.

Test any level in the address bar: `?q=0`, `?q=1`, `?q=2`, `?q=3`, or `?lite=1`.

## What is where

| File | What it does |
| --- | --- |
| `index.html` | All page copy: hero lockup, the eight department chapters, index, contact panel, shared logo symbols |
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
| `js/st-hero.js` … `st-finale.js` | One 3D scene per section (`st-crew.js` is the ring of six beads) |

Scenes, in scroll order: **hero** (the 3D logo) → Poster Design (a three-layer poster) → Reel
Editing (a phone) → Meta & Google Ads (a target and one arrow) → Web Development (a
three-layer web page) → Automations (four steps and a travelling dot) → CRM (a glass funnel)
→ Analytics (seven bars and a line) → Brand & Social (the logo and its three colours) → **crew** (a ring of six beads) →
**contact** (the logo, larger).

## Things to check before launch

- **Social links** — only Instagram and Facebook are linked (LinkedIn / YouTube were removed because no links were given). Add more as `<a data-app="…">` or plain links in the `#contact` block of `index.html`.
- **Phones** — the app hand-offs (Gmail, Instagram, Facebook) were checked as generated links in an emulated Android browser; try them once on a real Android phone and iPhone.
- **Copy** — every chapter is a `<section class="chapter">` in `index.html`. The mock-ups inside the scenes use a generic "yourbrand".

## Adding or reordering a department

Each scene is `ELORA.add({ id, cam, build })` in its own file. Add `js/st-yourname.js`,
include it in `index.html` before `main.js`, and add a matching
`<section class="chapter" data-i="…">` and index link. Keep the finale last.

## Notes

- Mouse: the scene leans with the pointer; dragging sideways turns the object on stage.
- `prefers-reduced-motion` shortens the intro and calms the camera.
