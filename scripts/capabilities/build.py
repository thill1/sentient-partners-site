"""Builds public/capabilities.pdf (run: python3 scripts/capabilities/build.py).
Copy mirrors the live site; contact is hello@ only. Needs reportlab and fonttools."""
import os, tempfile
from fontTools.ttLib import TTFont
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NAVY, GOLD, BRONZE, INK, MUTED, PAPER = (HexColor(c) for c in ("#0D1F4E", "#C8B795", "#8A7650", "#1B2333", "#5B6577", "#F6F3EC"))
TAGLINE = "Business Strategy. Intelligent Systems. Measurable Results."
BOOKING = "https://cal.com/sentient-partners-strategy/introductory-call"
tmp = tempfile.mkdtemp()
for name, file in [("Serif", "cormorant-garamond-normal-500"), ("SerifItalic", "cormorant-garamond-italic-400"), ("Sans", "inter-normal-400"), ("SansBold", "inter-normal-600")]:
    f = TTFont(os.path.join(ROOT, "public", "fonts", f"{file}.woff2")); f.flavor = None
    p = os.path.join(tmp, f"{file}.ttf"); f.save(p); pdfmetrics.registerFont(RLFont(name, p))
MONO = os.path.join(ROOT, "public", "atmosphere", "sp-monogram-white-72.png")

S = {
    "h1": ParagraphStyle("h1", fontName="Serif", fontSize=32, leading=35, textColor=NAVY, spaceAfter=6),
    "tag": ParagraphStyle("tag", fontName="SerifItalic", fontSize=17, leading=21, textColor=BRONZE, spaceAfter=14),
    "h2": ParagraphStyle("h2", fontName="Serif", fontSize=19, leading=23, textColor=NAVY, spaceBefore=10, spaceAfter=6, keepWithNext=1),
    "eb": ParagraphStyle("eb", fontName="SansBold", fontSize=7.5, leading=10, textColor=BRONZE, spaceAfter=3),
    "body": ParagraphStyle("body", fontName="Sans", fontSize=9.8, leading=14.5, textColor=INK, spaceAfter=7),
    "cell": ParagraphStyle("cell", fontName="Sans", fontSize=9, leading=12.8, textColor=INK),
    "ct": ParagraphStyle("ct", fontName="Serif", fontSize=13.5, leading=16, textColor=NAVY, spaceAfter=2),
    "note": ParagraphStyle("note", fontName="Sans", fontSize=8, leading=11, textColor=MUTED),
}

def chrome(c, d):
    w, h = d.pagesize
    c.setFillColor(NAVY); c.rect(0, h - 0.62 * inch, w, 0.62 * inch, stroke=0, fill=1)
    c.drawImage(MONO, 0.6 * inch, h - 0.52 * inch, width=0.25 * inch, height=0.42 * inch, mask="auto")
    c.setFillColor(white); c.setFont("Serif", 12.5); c.drawString(0.95 * inch, h - 0.36 * inch, "SENTIENT  PARTNERS")
    c.setFillColor(GOLD); c.setFont("Sans", 7.5); c.drawRightString(w - 0.6 * inch, h - 0.36 * inch, "CAPABILITIES")
    c.setStrokeColor(GOLD); c.setLineWidth(0.6); c.line(0.6 * inch, 0.62 * inch, w - 0.6 * inch, 0.62 * inch)
    c.setFillColor(MUTED); c.setFont("Sans", 7.5)
    c.drawString(0.6 * inch, 0.42 * inch, f"Sentient Partners  ·  {TAGLINE}")
    c.drawRightString(w - 0.6 * inch, 0.42 * inch, f"sentientpartners.ai  ·  hello@sentientpartners.ai  ·  Page {d.page}")

def grid(items, cols=2, gap=12):
    width = (7.3 * inch - gap * (cols - 1)) / cols
    cells = []
    for eb, title, text in items:
        t = Table([[Paragraph(eb, S["eb"])], [Paragraph(title, S["ct"])], [Paragraph(text, S["cell"])]], colWidths=[width])
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PAPER), ("LINEBEFORE", (0, 0), (0, -1), 2, GOLD),
                               ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                               ("TOPPADDING", (0, 0), (-1, 0), 9), ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
                               ("TOPPADDING", (0, 1), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -2), 1)]))
        cells.append(t)
    rows = [cells[i:i + cols] for i in range(0, len(cells), cols)]
    g = Table([sum(([c, ""] for c in r), [])[:-1] for r in rows], colWidths=sum(([width, gap] for _ in range(cols)), [])[:-1])
    g.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                           ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), gap)]))
    return g

story = [
    Paragraph("BUSINESS STRATEGY AND ADVISORY", S["eb"]),
    Paragraph("Sentient Partners", S["h1"]),
    Paragraph(TAGLINE, S["tag"]),
    Paragraph("Sentient Partners is a founder-led consultancy for growing businesses. We start with how the business actually runs, "
              "agree on what is worth fixing first, then build and launch the systems that put the plan to work, and measure the result.", S["body"]),
    Paragraph("Start where it hurts most.", S["h2"]),
    Paragraph("Missed calls. Lost leads. Hours of double entry. Pick one. We bring the plan and the systems.", S["body"]),
    Spacer(1, 4),
    grid([
        ("01", "Advise &amp; Grow", "A clear view of your business, a sensible roadmap and priorities, and hands-on implementation."),
        ("02", "Attract &amp; Convert", "Websites, search visibility and reputation that help the right customers find you, trust you and get in touch."),
        ("03", "Automate &amp; Communicate", "Chat and voice assistants, scheduling and follow-up, so inquiries are answered and nothing slips."),
        ("04", "Operate &amp; Scale", "Business applications and workflow automation for jobs, crews, estimates and invoices, with less retyping."),
    ]),
    Paragraph("How we partner", S["h2"]),
    grid([
        ("01", "Discover", "We learn your business, where it sticks, and what's worth fixing first."),
        ("02", "Design", "A practical strategy, clear priorities, and a roadmap we agree on."),
        ("03", "Deliver", "We build, test and launch with your team, then refine as you grow."),
    ], cols=3),
    Paragraph("Direct access to your partner. No hand-offs: the person on your first call builds your system.", S["body"]),
    PageBreak(),
    Paragraph("CAPABILITIES", S["eb"]),
    Paragraph("Systems that put the plan to work.", S["h2"]),
    Paragraph("Each engagement is scoped to your business, budget and existing tools. We recommend a solution only after understanding how you work today.", S["body"]),
    grid([
        ("01", "Premium websites", "Custom, mobile-first websites with clear messaging, hosting and care."),
        ("02", "Search visibility", "Business profile care, service pages and sound technical foundations."),
        ("03", "Calendar &amp; scheduling", "Online booking, team calendar sync and reminders."),
        ("04", "Business applications", "Practical tools for jobs, customers, estimates and invoices."),
        ("05", "Workflow automation", "Connections between existing tools, with readable rules and human approval steps."),
        ("06", "Reputation &amp; reviews", "Review requests to every customer and drafted responses the owner approves."),
        ("07", "AI chat assistants", "Website and messaging assistants that answer routine questions and hand off to a person."),
        ("08", "AI voice agents", "After-hours and overflow call answering with summaries sent to the team."),
    ]),
    Paragraph("Our founder", S["h2"]),
    Paragraph("After senior executive leadership roles at Hewlett-Packard and E*TRADE Financial, Troy Hill founded Sentient Partners "
              "to bring that discipline to growing businesses.", S["body"]),
    Spacer(1, 6),
    KeepTogether([
        Paragraph("Start with a conversation.", S["h2"]),
        Paragraph(f'Book a 20-minute introductory call at <link href="{BOOKING}" color="#0D1F4E"><u>cal.com/sentient-partners-strategy/introductory-call</u></link>, '
                  'call (415) 504-2757, or write to <link href="mailto:hello@sentientpartners.ai" color="#0D1F4E"><u>hello@sentientpartners.ai</u></link>.', S["body"]),
        Paragraph("Auburn, California  ·  Placer County  ·  Greater Sacramento  ·  sentientpartners.ai", S["note"]),
    ]),
]
out = os.path.join(ROOT, "public", "capabilities.pdf")
d = BaseDocTemplate(out, pagesize=letter, title="Capabilities | Sentient Partners", author="Sentient Partners", subject=TAGLINE,
                    leftMargin=0.6 * inch, rightMargin=0.6 * inch, topMargin=0.95 * inch, bottomMargin=0.85 * inch)
d.addPageTemplates([PageTemplate(frames=[Frame(d.leftMargin, d.bottomMargin, d.width, d.height, id="f")], onPage=chrome)])
d.build(story)
print(out)
