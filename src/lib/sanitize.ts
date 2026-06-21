import sanitizeHtml from "sanitize-html"

export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
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
      p: ["style"],
    },
    allowedSchemes: ["https", "http"],
  })
}
