"""
Web scraper untuk website Telkom University.
Mengambil konten dari URL dan mengubahnya menjadi chunks siap embed.
"""
import re
import httpx
from bs4 import BeautifulSoup

# Elemen yang tidak relevan untuk konten akademik
_SKIP_TAGS = {"script", "style", "nav", "footer", "header", "aside", "form", "button", "iframe"}

# Allowed Telkom University domains
ALLOWED_DOMAINS = {
    "telkomuniversity.ac.id",
    "student.telkomuniversity.ac.id",
    "akademik.telkomuniversity.ac.id",
    "id.telkomuniversity.ac.id",
}


async def scrape_url(
    url: str,
    chunk_size: int = 400,
    chunk_overlap: int = 50,
) -> list[dict]:
    """
    Scrape a single URL and return chunks [{text, page_number: None}].
    page_number is None for web content (replaced by URL section heading).
    """
    _validate_domain(url)
    html = await _fetch(url)
    text = _extract_text(html)
    if not text:
        return []
    return _chunk_text(text, chunk_size, chunk_overlap)


async def scrape_telkom_site(
    start_url: str,
    max_pages: int = 30,
    chunk_size: int = 400,
    chunk_overlap: int = 50,
) -> list[dict[str, object]]:
    """
    Crawl multiple pages from Telkom University website.
    Returns list of {url, title, chunks: [{text}]}.
    """
    _validate_domain(start_url)
    visited: set[str] = set()
    queue = [start_url]
    results = []

    async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
        while queue and len(visited) < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            try:
                response = await client.get(url, headers={"User-Agent": "TelkomAcademicBot/1.0"})
                response.raise_for_status()
            except Exception:
                continue

            html = response.text
            text = _extract_text(html)
            title = _extract_title(html)

            if text:
                results.append(
                    {
                        "url": url,
                        "title": title,
                        "chunks": _chunk_text(text, chunk_size, chunk_overlap),
                    }
                )

            # Enqueue internal links
            for link in _extract_links(html, url):
                if link not in visited and _is_allowed(link):
                    queue.append(link)

    return results


# ── helpers ────────────────────────────────────────────────────────────────────

def _validate_domain(url: str) -> None:
    from urllib.parse import urlparse
    hostname = urlparse(url).hostname or ""
    if not any(hostname == d or hostname.endswith("." + d) for d in ALLOWED_DOMAINS):
        raise ValueError(f"Domain tidak diizinkan: {hostname}. Hanya domain Telkom University.")


def _is_allowed(url: str) -> bool:
    try:
        _validate_domain(url)
        return True
    except ValueError:
        return False


async def _fetch(url: str) -> str:
    async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
        response = await client.get(url, headers={"User-Agent": "TelkomAcademicBot/1.0"})
        response.raise_for_status()
        return response.text


def _extract_title(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    tag = soup.find("title")
    return tag.get_text(strip=True) if tag else "Halaman Telkom University"


def _extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(_SKIP_TAGS):
        tag.decompose()

    # Prefer main content area if available
    main = soup.find("main") or soup.find("article") or soup.find(id="content") or soup.body
    if not main:
        return ""

    text = main.get_text(separator="\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _extract_links(html: str, base_url: str) -> list[str]:
    from urllib.parse import urljoin, urlparse, urlunparse
    soup = BeautifulSoup(html, "lxml")
    links = []
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        # Strip fragment and query for dedup
        parsed = urlparse(href)
        clean = urlunparse(parsed._replace(fragment="", query=""))
        if clean.startswith("http"):
            links.append(clean)
    return links


def _chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[dict]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if len(chunk) > 50:
            chunks.append({"text": chunk, "page_number": None})
        if end == len(words):
            break
        start += chunk_size - chunk_overlap
    return chunks
