# elora — Marketing Media (website)

A clean, Apple-style one-page site with a moderate brutalist edge (big tight headlines, mono
labels, hard-bordered stickers, a project-pass ticket). There is only **one** small 3D scene:
the hero shows the elora mark in glossy blue with three marketing objects around it — a like
(heart), a reel (play tile) and growth (bar chart). Everything else is plain HTML + CSS.

## Run it

```bash
python -m http.server 5173
```

then visit http://localhost:5173. Any static host works (Vercel, Netlify, GitHub Pages): upload
the folder as it is. The hero needs an internet connection for three.js (CDN); without WebGL it
shows the flat SVG logo instead.

## What is where

| File | What it does |
| --- | --- |
| `index.html` | All page copy: hero, services (3 departments), process, crew, contact, footer |
| `css/site.css` | Design tokens at the top (`:root`), layout, phone layout |
| `js/hero3d.js` | The one 3D scene in the hero (pauses when off screen, respects reduced motion) |
| `js/logo.js` | Logo outline data used to build the 3D mark |
| `js/crew.js` | The team cards — edit the `CREW` list |
| `js/contact.js` | Contact form → pre-filled Gmail (address in `TO` at the top) |
| `js/links.js` | Opens Gmail / Instagram / Facebook in their apps on phones |
| `js/site.js` | Reveal-on-scroll, nav highlight, mobile menu |
| `js/work.js` | Work reels: play muted while on screen, tap for sound |
| `assets/work/` | The four reels (compressed to 720×1280, 30 fps) and their poster images |
| `assets/clients/` | Client logos (trimmed WebP) |
| (git history) | The earlier full-3D version is commit `ea59462` |

## Work and clients

**Selected work** shows four reels made for SSV Infra & Developers. The originals (about 200 MB
each) were compressed to about 5–11 MB each so the page loads fast. To add a reel, copy one `<li class="reel">`
block in `index.html` and point it at a new `assets/work/reel-….mp4` and `poster-….webp`.

**Our clients**: Moon City Homes & Developers, SRK Township, SSV Infra & Developers and
Tiny Treats. Add a client by copying one `<li class="client">` block and dropping its logo into
`assets/clients/`.

## The crew

Five people: Srikar Dittakavi (Founder), Pavan Kumar Cheekati (CEO), **Sazid Vali Shaik (MD)**,
Harshadeep Pulicherla (Co-Founder) and Karthik Davuluri (CTO). Each card has Call (`tel:`),
Write (opens Gmail addressed to that person) and, where listed, Portfolio. `md: true` gives a
card the blue MD badge.

## Contact → Gmail

The form sends the brief to **growwithelora@gmail.com** by opening a pre-filled Gmail compose
window (Gmail app on Android/iPhone, Gmail on the web on desktop). If an in-app browser blocks
the hand-off, a row of fallback buttons appears (Gmail app / web / Mail app / Copy brief).
