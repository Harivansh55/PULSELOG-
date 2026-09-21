import markdown
import bleach

ALLOWED_TAGS = [
    "a", "abbr", "acronym", "b", "blockquote", "code", "em", "i", "li", "ol",
    "p", "strong", "ul", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "hr",
    "br", "img", "table", "thead", "tbody", "tr", "th", "td", "span"
]

ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title", "width", "height"],
    "code": ["class"],
    "span": ["class"],
    "th": ["align"],
    "td": ["align"],
}

ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def render_markdown_to_safe_html(content_markdown: str) -> str:
    """Convert markdown to sanitized HTML, preventing XSS and script injection."""
    if not content_markdown:
        return ""

    raw_html = markdown.markdown(
        content_markdown,
        extensions=["fenced_code", "tables", "nl2br", "sane_lists"]
    )

    clean_html = bleach.clean(
        raw_html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True
    )
    return clean_html
