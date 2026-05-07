// Deno-compatible HTML → plain text helper.
// Used to derive a plaintext alternative when only body_html is provided.

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  let s = html;

  // Remove style/script blocks completely
  s = s.replace(/<\s*(style|script)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "");

  // Convert links to "text (url)"
  s = s.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => {
    const t = text.replace(/<[^>]+>/g, "").trim();
    if (!t) return href;
    if (t === href) return href;
    return `${t} (${href})`;
  });

  // Images → alt text
  s = s.replace(/<img\s+[^>]*alt=["']([^"']*)["'][^>]*>/gi, (_m, alt) => alt ? `[${alt}]` : "");
  s = s.replace(/<img[^>]*>/gi, "");

  // Block-level tags → newlines
  s = s.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|blockquote|tr|section|article)>/gi, "\n\n");
  s = s.replace(/<li[^>]*>/gi, "• ");
  s = s.replace(/<\/li>/gi, "\n");
  s = s.replace(/<\/(ul|ol)>/gi, "\n");

  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");

  // Collapse whitespace
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

export function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*?>/i.test(s || "");
}
