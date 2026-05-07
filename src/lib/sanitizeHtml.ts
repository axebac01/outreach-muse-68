import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "a","b","strong","i","em","u","s","strike","p","br","div","span",
  "h1","h2","h3","h4","ul","ol","li","blockquote","pre","code","img","hr",
];

const ALLOWED_ATTR = ["href","target","rel","src","alt","title","style","class","width","height"];

export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script","style","iframe","object","embed","form","input"],
  });
}

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  // Replace block ends + <br> with newlines, then strip
  const withBreaks = html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ");
  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.innerHTML = withBreaks;
    return (div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }
  return withBreaks.replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
