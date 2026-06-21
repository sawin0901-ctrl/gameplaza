import sanitizeHtml from "sanitize-html"

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
      "*": (tagName, attribs) => {
        if (attribs.style) {
          const s = stripColorFromStyle(attribs.style)
          if (s) attribs.style = s
          else delete attribs.style
        }
        return { tagName, attribs }
      },
    },
  })
}
