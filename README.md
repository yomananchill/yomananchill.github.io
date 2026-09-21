# yomananchill

Personal site for Manan Patel (`0xManan`) - disclosure record, audit corpus, blogs.

Static HTML, CSS and vanilla JS. **No build step, no dependencies, no install.**
Open `index.html` over any static server and it runs.

## Layout

| File | What |
|---|---|
| `index.html` | Shell. Loads everything below. |
| `app.js` | Router, views, filters, Markdown renderer. |
| `app.css` | All styling. 8px spacing scale, two type tiers. |
| `bg.js` | Ambient hex field and cursor overlay. Purely decorative - if it throws it removes itself. |
| `data.js` | Identity, work history, projects, certifications, commendations. |
| `reports.js` | The disclosure record. |
| `audits.js` | Codebases under review. **Contains no findings, deliberately.** |
| `posts/` | Blog posts. See `posts/HOW-TO-POST.md`. |

## Editing

Everything is data. To change the site you almost always edit `data.js`,
`reports.js` or `audits.js` - not the views.

### Publishing a finding

`reports.js` entries carry `depth`:

- `"full"` renders a complete writeup. **Only for findings verified fixed
  upstream**, with a patch, advisory or release note on record.
- `"index"` renders title, class, project, date and status only. No root cause.

And `credited`:

- `true` - the identifier was assigned to this report.
- `false` - found independently but filed second; the identifier belongs to the
  first reporter, and the page says so.

Promoting `index` to `full` is a one-word change. Do not promote anything that
is still unpatched.

### Publishing a post

See [`posts/HOW-TO-POST.md`](posts/HOW-TO-POST.md). Add a `.md` file, add one
entry to `posts/index.js`, commit.

## Local preview

```
python3 -m http.server 4321
```

Then open http://localhost:4321
