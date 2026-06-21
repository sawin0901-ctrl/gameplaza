import sanitizeHtml from "sanitize-html"

export function cleanDescriptionHtml(html: string): string {
  let c = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  // 3+ consecutive <br> → paragraph break
  c = c.replace(/(<br\s*\/?>\s*\n?\s*){3,}/gi, "</p><p>")
  // double <br> → paragraph break
  c = c.replace(/(<br\s*\/?>\s*\n?\s*){2}/gi, "</p><p>")
  // empty paragraphs
  c = c.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "")
  // lone <br> at start/end of paragraph
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
  })
}
