import sanitizeHtml from "sanitize-html"

// plati.market domain pattern — used to strip seller links from descriptions
const PLATI_RE = /plati\.(market|ru|com|online|cash)/i

function stripColorFromStyle(style: string): string {
  return style
    .replace(/\bcolor\s*:[^;]+;?/gi, "")
    .replace(/\bbackground(?:-color)?\s*:[^;]+;?/gi, "")
    .replace(/\bfont-color\s*:[^;]+;?/gi, "")
    .replace(/\bopacity\s*:[^;]+;?/gi, "")
    .trim().replace(/;+\s*$/g, "")
}

export function cleanDescriptionHtml(html: string): string {
  let c = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  // Remove <a href="...plati...">...</a> entirely (seller cross-links)
  c = c.replace(/<a[^>]*href=["\x27][^"']*plati\.[^"']*["\x27][^>]*>[\s\S]*?<\/a>/gi, "")
  // Remove bare plati URLs from plain text
  c = c.replace(/https?:\/\/(?:www\.)?plati\.\S+/gi, "")
  c = c.replace(/(?:^|\s)(?:www\.)?plati\.market\/\S*/gim, " ")

  // Collapse multiple <br> into paragraph breaks
  c = c.replace(/(<br\s*\/?>\s*\n?\s*){3,}/gi, "</p><p>")
  c = c.replace(/(<br\s*\/?>\s*\n?\s*){2}/gi, "</p><p>")
  c = c.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "")
  c = c.replace(/<p>\s*<br\s*\/?>/gi, "<p>")
  c = c.replace(/<br\s*\/?>\s*<\/p>/gi, "</p>")
  return c
}

export function sanitizeDescription(html: string): string {
  const cleaned = cleanDescriptionHtml(html)
  return sanitizeHtml(cleaned, {
    allowedTags: [
      "p", "br", "b", "i", "em", "strong", "ul", "ol", "li",
      "h2", "h3", "h4", "h5", "h6", "a", "span", "div",
      "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "pre", "code", "hr",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      span: ["class", "style"],
      div: ["class", "style"],
      table: ["class", "style"],
      th: ["class", "style", "colspan", "rowspan"],
      td: ["class", "style", "colspan", "rowspan"],
      p: ["style", "class"],
    },
    allowedSchemes: ["https", "http"],
    transformTags: {
      // Strip color/background from ALL elements
      "*": (tagName, attribs) => {
        if (attribs.style) {
          const s = stripColorFromStyle(attribs.style)
          if (s) attribs.style = s
          else delete attribs.style
        }
        return { tagName, attribs }
      },
      // For <a> tags: block plati links, secure external links
      a: (tagName, attribs) => {
        if (attribs.style) {
          const s = stripColorFromStyle(attribs.style)
          if (s) attribs.style = s
          else delete attribs.style
        }
        // Plati link — degrade to <span>, keeping visible text
        if (attribs.href && PLATI_RE.test(attribs.href)) {
          return { tagName: "span", attribs: {} }
        }
        // Secure all external links
        attribs.rel = "noopener noreferrer"
        attribs.target = "_blank"
        return { tagName, attribs }
      },
    },
  })
}