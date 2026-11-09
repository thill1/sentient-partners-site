"""Import LIVE LinkedIn company posts from /workspace/sentient-linkedin into content/insights/."""
from __future__ import annotations
import os, re, shutil, subprocess
from pathlib import Path

DRAFTS = Path("/workspace/sentient-linkedin/drafts")
ART = Path("/workspace/sentient-linkedin/post-art")
BRAND = Path("/workspace/sentient-linkedin/brand-kit")
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "content" / "insights"
IMG = ROOT / "public" / "insights" / "img"
IMG.mkdir(parents=True, exist_ok=True)

def yaml_escape(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

def excerpt_of(caption: str) -> str:
    paras = [p.strip() for p in re.split(r"\n\s*\n", caption.strip()) if p.strip()]
    # Prefer a second paragraph that carries the data point, else first.
    pick = paras[1] if len(paras) > 1 and len(paras[0]) < 80 else paras[0]
    pick = re.sub(r"\s+", " ", pick)
    if len(pick) > 170:
        pick = pick[:169].rsplit(" ", 1)[0].rstrip(",.;:") + "…"
    return pick

def parse_sources(text: str) -> str:
    m = re.search(r"(?ms)^Sources[^\n]*\n(.*?)(?=^Theme:|^Freshness|^## Caption|\Z)", text)
    if not m:
        return ""
    block = m.group(1).strip()
    lines = []
    for raw in block.splitlines():
        raw = raw.rstrip()
        if not raw.strip():
            continue
        if raw.lstrip().startswith("- ") and "http" in raw:
            # top-level source with optional trailing URL on next lines
            lines.append(raw.strip())
        elif re.match(r"^\s+https?://", raw):
            url = raw.strip()
            if lines and not lines[-1].endswith(url):
                lines[-1] = lines[-1].rstrip(":") + f": {url}" if not re.search(r"https?://", lines[-1]) else lines[-1]
            else:
                lines.append(f"- {url}")
        elif raw.lstrip().startswith("- ") and lines:
            # nested bullet — skip the invented-stat detail lists; keep only top sources with URLs
            continue
    # Keep only bullets that contain a URL
    kept = [ln for ln in lines if "http" in ln]
    if not kept:
        return ""
    body = "\n".join(kept)
    # Turn "Title: https://..." into markdown links where clean
    def linkify(line: str) -> str:
        m = re.search(r"(https?://\S+)", line)
        if not m:
            return line
        url = m.group(1).rstrip(").,;")
        before = line[: m.start()].rstrip(" :")
        before = re.sub(r"^-\s*", "", before)
        return f"- [{before}]({url})" if before else f"- {url}"
    return "## Sources\n\n" + "\n".join(linkify(ln) for ln in kept) + "\n"

def find_url(text: str) -> str | None:
    for pat in [
        r"Status:\s*LIVE[^\n]*?(https://www\.linkedin\.com/\S+)",
        r"^URL:\s*(https://www\.linkedin\.com/\S+)",
    ]:
        m = re.search(pat, text, re.M)
        if m:
            return m.group(1).rstrip(").,/ ") + ("/" if not m.group(1).rstrip(").,/ ").endswith("/") else "")
    return None

def find_asset(text: str, stem: str) -> Path | None:
    m = re.search(r"(?:Asset|Visual):\s*(\S+\.(?:png|jpg|jpeg|webp|mp4))", text)
    if m:
        p = Path(m.group(1))
        if p.exists():
            return p
    # heuristics by stem
    for cand in [
        ART / f"{stem}.png",
        ART / f"{stem}-v2-dark.png",
        ART / f"{stem}-v2-type.png",
    ]:
        if cand.exists():
            return cand
    # stem without date prefix extras
    for p in ART.glob(f"{stem}*.png"):
        if "v2-type" in p.name:
            continue
        return p
    return None

def convert_asset(src: Path, dest_stem: str) -> str | None:
    """Copy/convert to public/insights/img/<dest_stem>.webp (or .png). Return site path or None."""
    dest_webp = IMG / f"{dest_stem}.webp"
    if src.suffix.lower() == ".mp4":
        # poster frame at 1.5s
        poster = IMG / f"{dest_stem}-poster.png"
        subprocess.run(
            ["ffmpeg", "-y", "-ss", "1.5", "-i", str(src), "-frames:v", "1", str(poster)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        src = poster
    try:
        from PIL import Image
        im = Image.open(src).convert("RGB")
        # Cap width at 1200 for web
        if im.width > 1200:
            im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
        im.save(dest_webp, "WEBP", quality=82, method=6)
        return f"/insights/img/{dest_stem}.webp"
    except Exception as e:
        dest = IMG / f"{dest_stem}{src.suffix.lower()}"
        shutil.copy2(src, dest)
        return f"/insights/img/{dest.name}"

report = {"added": [], "updated": [], "missing_image": [], "missing_url": [], "skipped_not_live": [], "diffs": []}

# Expected LIVE list from the brief
expected = {
    "2026-08-21", "2026-09-07", "2026-09-14", "2026-09-14-smb-labor",
    "2026-09-28-margin-inside", "2026-09-30-late-payments", "2026-10-01-q4-tech-spend",
    "2026-10-02-succession-gap", "2026-10-05-delayed-investment", "2026-10-06",
    "2026-10-07", "2026-10-09", "2026-10-12-untested-backups", "2026-10-13-money-with-a-job",
    "2026-10-14-fewer-tools", "2026-10-15-expensive-money", "2026-10-16-lean-team-cost",
    "2026-10-19-findable-before-rush", "2026-10-20-renewal-letter", "2026-10-21-slower-yes",
    "2026-10-22-new-bank-details", "2026-10-23-last-day-access", "2026-10-26-unanswered-reviews",
    "2026-10-27-1099-threshold", "2026-10-28-exempt-salary-line", "2026-10-29-profit-first-plan",
    "2026-11-02-week-without-you", "2026-11-03-subscription-owner", "2026-11-04-after-hours-call",
    "2026-11-05-last-price-change", "2026-11-06-holiday-roster", "2026-11-09-monday-numbers",
}

live_stems = set()
for path in sorted(DRAFTS.glob("*.md")):
    text = path.read_text(encoding="utf-8")
    stem = path.stem
    status_line = next((ln for ln in text.splitlines() if ln.startswith("Status:")), "")
    is_live = status_line.startswith("Status: LIVE")
    if not is_live:
        if stem in expected:
            report["diffs"].append(f"EXPECTED LIVE but Status is not LIVE: {stem} → {status_line[:120]}")
        report["skipped_not_live"].append(f"{stem}: {status_line[:100]}")
        continue
    live_stems.add(stem)
    if stem not in expected:
        report["diffs"].append(f"LIVE but not in expected list: {stem}")

for stem in sorted(expected - live_stems):
    report["diffs"].append(f"In expected list but not LIVE on disk: {stem}")

for path in sorted(DRAFTS.glob("*.md")):
    text = path.read_text(encoding="utf-8")
    if not next((ln for ln in text.splitlines() if ln.startswith("Status: LIVE")), None):
        continue
    stem = path.stem
    date = stem[:10]
    assert re.match(r"\d{4}-\d{2}-\d{2}", date), stem
    url = find_url(text)
    if not url:
        report["missing_url"].append(stem)
        continue
    cap_m = re.search(r"(?ms)^## Caption\n+(.*?)(?=\n## |\Z)", text)
    if not cap_m:
        report["diffs"].append(f"No ## Caption in {stem}")
        continue
    caption = cap_m.group(1).strip() + "\n"
    # Drop trailing blank-only
    sources = parse_sources(text)
    asset = find_asset(text, stem)
    image_path = None
    if asset:
        image_path = convert_asset(asset, f"linkedin-{stem}")
    else:
        report["missing_image"].append(stem)

    slug = f"linkedin-{stem}"
    # Keep existing slug pattern used on site for the seven already published
    out_name = f"{date}-linkedin-{stem}.md"
    excerpt = excerpt_of(caption)
    # Brand scan
    lowered = (caption + sources).lower()
    for bad in ("ai-first agency", "ai first agency", "troyhill@", " audit", "audit,"):
        if bad in lowered and bad.strip() != "audit":  # allow word in sources? ban everywhere
            pass
    if re.search(r"\baudit\b|ai[- ]first agency|troyhill@", lowered):
        report["diffs"].append(f"Brand-rule hit in {stem} — review before ship")

    fm = [
        "---",
        f'slug: "{slug}"',
        "type: linkedin",
        f"date: {date}",
        f'external_url: "{url}"',
        f"excerpt: {yaml_escape(excerpt)}",
        "status: approved",
    ]
    if image_path:
        fm.append(f'image: "{image_path}"')
    fm.append("---")
    body = caption.rstrip() + "\n"
    if sources:
        body += "\n" + sources
    content = "\n".join(fm) + "\n" + body
    out = OUT / out_name
    existed = out.exists()
    # Also remove older variants with same slug if any
    for old in OUT.glob(f"*-linkedin-{stem}.md"):
        if old != out:
            old.unlink()
    out.write_text(content, encoding="utf-8")
    report["updated" if existed else "added"].append(out_name)

# Write a machine-readable summary
summary = OUT.parent.parent / "scripts" / "insights" / "import-report.txt"
lines = []
for k, v in report.items():
    lines.append(f"## {k} ({len(v)})")
    lines.extend(f"- {x}" for x in v)
    lines.append("")
summary.write_text("\n".join(lines), encoding="utf-8")
print(summary.read_text())
print(f"LIVE count: {len(live_stems)}; expected: {len(expected)}")
