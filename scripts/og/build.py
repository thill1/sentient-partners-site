"""Per-page share images (1200x630) for every built page, then wires og:image and
twitter:image in each page's HTML. Runs at the end of `npm run build` on dist/.
Needs Pillow and fonttools."""
import hashlib, html, os, re, sys, tempfile
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIST = os.path.join(ROOT, "dist")
SITE = "https://sentientpartners.ai"
NAVY, DEEP, CHAMP, IVORY, MUTED = "#0D1F4E", "#081536", "#C8B795", "#F3F0E8", "#AEB6C8"
TAGLINE = "Business Strategy. Intelligent Systems. Measurable Results."
W, H = 1200, 630

tmp = tempfile.mkdtemp()
def font(name, size):
    path = os.path.join(tmp, name + ".ttf")
    if not os.path.exists(path):
        f = TTFont(os.path.join(ROOT, "public", "fonts", name + ".woff2")); f.flavor = None; f.save(path)
    return ImageFont.truetype(path, size)

MONO = Image.open(os.path.join(ROOT, "public", "atmosphere", "sp-monogram-white.png")).convert("RGBA")

def wrap(draw, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        test = (line + " " + word).strip()
        if draw.textlength(test, font=fnt) <= width or not line:
            line = test
        else:
            lines.append(line); line = word
    lines.append(line)
    return lines

def render(eyebrow, title, out):
    im = Image.new("RGB", (W, H), DEEP)
    d = ImageDraw.Draw(im)
    for y in range(H):  # deep navy to brand navy
        t = y / H
        c = tuple(int(a + (b - a) * t) for a, b in zip((8, 21, 54), (13, 31, 78)))
        d.line([(0, y), (W, y)], fill=c)
    d.rectangle([0, 0, 10, H], fill=CHAMP)
    mono = MONO.copy(); mono.thumbnail((40, 66)); im.paste(mono, (80, 62), mono)
    d.text((136, 78), "SENTIENT  PARTNERS", font=font("cormorant-garamond-normal-500", 30), fill=IVORY)
    d.text((80, 178), eyebrow.upper(), font=font("inter-normal-600", 22), fill=CHAMP)
    size = 76
    while True:
        f = font("cormorant-garamond-normal-500", size)
        lines = wrap(d, title, f, W - 180)
        if len(lines) <= 3 or size <= 50:
            break
        size -= 4
    lines = lines[:3]
    y = 222
    for ln in lines:
        d.text((80, y), ln, font=f, fill=IVORY); y += int(size * 1.08)
    d.line([(80, H - 112), (W - 80, H - 112)], fill=CHAMP, width=2)
    d.text((80, H - 92), TAGLINE, font=font("cormorant-garamond-italic-400", 30), fill=CHAMP)
    url = "sentientpartners.ai"
    uf = font("inter-normal-500", 20)
    d.text((W - 80 - d.textlength(url, font=uf), H - 84), url, font=uf, fill=MUTED)
    im.save(out, "PNG", optimize=True)

def eyebrow_for(path, page_html):
    if path == "/":
        return "Business strategy and advisory"
    if path.startswith("/tools/") and path != "/tools/":
        return "Free tool"
    if path == "/tools/":
        return "Free tools and templates"
    if path.startswith("/insights/"):
        m = re.search(r'class="(?:kicker|eyebrow)[^"]*"[^>]*>([^<]+)<', page_html)
        return html.unescape(m.group(1)).strip() if m else "Insights"
    return "Sentient Partners"

def title_for(path, page_html):
    if path == "/":
        return "Strategy for growing businesses, and the systems to match."
    m = re.search(r"<title>([^<]+)</title>", page_html)
    t = html.unescape(m.group(1)) if m else "Sentient Partners"
    t = re.sub(r"\s*\|\s*Sentient Partners.*$", "", t).strip() or "Sentient Partners"
    if t.endswith("…"):  # a cut-off post title: end on a whole word
        t = t[:-1].rsplit(" ", 1)[0].rstrip(",.;:") + "…"
    return t

def set_meta(page_html, prop_attr, prop, value):
    pat = re.compile(rf'(<meta\s+{prop_attr}="{re.escape(prop)}"\s+content=")[^"]*(")')
    if pat.search(page_html):
        return pat.sub(lambda m: m.group(1) + value + m.group(2), page_html)
    return page_html.replace("</head>", f'<meta {prop_attr}="{prop}" content="{value}">\n</head>', 1)

os.makedirs(os.path.join(DIST, "og"), exist_ok=True)
made = []
for dirpath, _, files in os.walk(DIST):
    for name in files:
        if not name.endswith(".html") or name == "404.html":
            continue
        file = os.path.join(dirpath, name)
        rel = os.path.relpath(file, DIST).replace(os.sep, "/")
        if rel.startswith(("og/", "admin")):
            continue
        path = "/" + (rel[: -len("index.html")] if rel.endswith("index.html") else rel[: -len(".html")])
        page = open(file, encoding="utf-8").read()
        if 'name="robots" content="noindex' in page:
            continue
        slug = path.strip("/").replace("/", "-") or "home"
        eyebrow, title = eyebrow_for(path, page), title_for(path, page)
        digest = hashlib.sha1(f"{eyebrow}|{title}".encode()).hexdigest()[:8]
        out_name = f"{slug}-{digest}.png"
        render(eyebrow, title, os.path.join(DIST, "og", out_name))
        img = f"{SITE}/og/{out_name}"
        page = set_meta(page, "property", "og:image", img)
        page = set_meta(page, "property", "og:image:width", "1200")
        page = set_meta(page, "property", "og:image:height", "630")
        page = set_meta(page, "property", "og:image:alt", html.escape(f"{title} | Sentient Partners", quote=True))
        page = set_meta(page, "name", "twitter:card", "summary_large_image")
        page = set_meta(page, "name", "twitter:image", img)
        open(file, "w", encoding="utf-8").write(page)
        made.append((path, out_name))
for p, n in sorted(made):
    print(f"og: {p} -> /og/{n}")
if len(made) < 5:
    sys.exit("og: too few pages found")
