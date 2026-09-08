# Adding embeds and responsive images

Three patterns are available now. Nothing about the site's architecture
changed — these are just HTML/CSS you paste in.

## Video embed

Replace a `<div class="media-placeholder">[ VIDEO ]</div>` (there are five of
these in `projects/woolies-todos.html` under "Core Flows") with:

```html
<div class="embed-responsive embed-video">
  <iframe src="https://www.youtube.com/embed/VIDEO_ID"
          title="Describe the clip"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen loading="lazy"></iframe>
</div>
```

Works the same for a Vimeo share link (`https://player.vimeo.com/video/ID`).
It scales with the column automatically — no fixed width/height to tune per
video.

## Figma prototype embed

```html
<div class="case-figure">
  <div class="embed-responsive embed-figma">
    <iframe src="https://www.figma.com/embed?embed_host=share&url=YOUR_FIGMA_SHARE_LINK"
            allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption>Optional caption</figcaption>
</div>
```

Get `YOUR_FIGMA_SHARE_LINK` from Figma's Share button → Copy link (prototype
tab open), then URL-encode it into the `url=` param, or just paste the whole
thing into Figma's own embed-code generator (Share → </> Embed) and drop the
resulting `<iframe>` in — either way, wrap it in
`<div class="embed-responsive embed-figma">…</div>`.

- Default box (`embed-figma`) is portrait-shaped — right for a phone flow.
- For a desktop/landscape prototype, use `embed-figma embed-figma--wide`
  instead.

## Responsive images

Any new photo you drop into `assets/` can get real responsive variants
(smaller files served to phones) with:

```bash
pip install --break-system-packages pillow   # once
python3 scripts/generate_responsive_images.py assets/your-photo.jpg
```

It writes `your-photo-640.jpg` / `-1024.jpg` / `-1600.jpg` next to the
original and prints the exact `<img>` tag to paste, srcset and all. The
eight photos already in the case studies and About page have already been
run through this — `woolies-platform.jpg`, `woolies-todos.jpg`,
`meW-problem.jpg`, `meW_todo_today.jpg` are wired up with srcset in their
case study pages now.

Background-image photos (the About page travel photos, the two project-grid
thumbnails on the homepage) don't support `srcset` — those stay as full-size
files, which is fine since they're small to begin with.
