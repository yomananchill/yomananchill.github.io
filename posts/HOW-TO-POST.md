# How to publish a blog post

Two files. Both editable in the GitHub web editor — no tooling, no build.

## 1. Write the post

Create `posts/your-slug.md`. Plain Markdown:

```
## A heading

A paragraph. **Bold**, *italic*, `inline code`, [a link](https://example.com).

- a list item
- another

> a quote

```code fence```

---
```

Supported: `#`–`####` headings, paragraphs, `**bold**`, `*italic*`, `` `code` ``,
fenced code blocks, links, bullet and numbered lists, blockquotes, and `---` rules.

## 2. Add it to the index

Open `posts/index.js` and add an entry at the top of the array:

```js
{
  slug: "your-slug",          // must match the filename, minus .md
  title: "Your title",
  date: "2026-09-21",         // YYYY-MM-DD
  tags: ["AI/ML", "SSRF"],
  summary: "One or two sentences shown on the index page.",
},
```

Commit. The post appears at `/#/b/your-slug` and in the Blogs list.

## Notes

- The Blogs page is always linked; with no posts it shows an empty state.
- Posts are fetched at read time, so a missing `.md` shows an error on that
  post's page only — the rest of the site is unaffected.
- Nothing here is coupled to the disclosure record. Adding posts cannot break it.
