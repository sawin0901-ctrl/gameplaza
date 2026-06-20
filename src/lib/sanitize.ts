import sanitizeHtml from "sanitize-html"

export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "b", "i", "em", "strong", "ul", "ol", "li",
      "h2", "h3", "h4", "a", "span", "div",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      span: ["class"],
      div: ["class"],
    },
    allowedSchemes: ["https", "http"],
  })
}
