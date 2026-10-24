"""Builds the free templates in public/templates/ (run: python3 scripts/templates/build.py).
Fonts are converted from the site's woff2 files; needs reportlab, openpyxl, fonttools."""
import csv, os, sys, tempfile
from fontTools.ttLib import TTFont
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "templates")
os.makedirs(OUT, exist_ok=True)
NAVY, GOLD, INK, MUTED, PAPER = HexColor("#0D1F4E"), HexColor("#C8B795"), HexColor("#1B2333"), HexColor("#5B6577"), HexColor("#F6F3EC")
TAGLINE = "Business Strategy. Intelligent Systems. Measurable Results."

tmp = tempfile.mkdtemp()
for name, file in [("Serif", "cormorant-garamond-normal-500"), ("SerifItalic", "cormorant-garamond-italic-400"), ("Sans", "inter-normal-400"), ("SansBold", "inter-normal-600")]:
    f = TTFont(os.path.join(ROOT, "public", "fonts", f"{file}.woff2")); f.flavor = None
    path = os.path.join(tmp, f"{file}.ttf"); f.save(path)
    pdfmetrics.registerFont(RLFont(name, path))
MONO = os.path.join(ROOT, "public", "atmosphere", "sp-monogram-white-72.png")

S = {
    "h1": ParagraphStyle("h1", fontName="Serif", fontSize=30, leading=33, textColor=NAVY, spaceAfter=4),
    "sub": ParagraphStyle("sub", fontName="SerifItalic", fontSize=16, leading=20, textColor=HexColor("#8A7650"), spaceAfter=14),
    "h2": ParagraphStyle("h2", fontName="Serif", fontSize=18, leading=22, textColor=NAVY, spaceBefore=8, spaceAfter=5, keepWithNext=1),
    "eyebrow": ParagraphStyle("eb", fontName="SansBold", fontSize=7.5, leading=10, textColor=HexColor("#8A7650"), spaceAfter=3),
    "body": ParagraphStyle("body", fontName="Sans", fontSize=9.5, leading=14, textColor=INK, spaceAfter=6),
    "note": ParagraphStyle("note", fontName="Sans", fontSize=8.5, leading=12, textColor=MUTED, spaceAfter=6),
    "script": ParagraphStyle("script", fontName="Sans", fontSize=9, leading=12.5, textColor=INK),
}

def chrome(title):
    def draw(c, doc):
        w, h = doc.pagesize
        c.setFillColor(NAVY); c.rect(0, h - 0.62 * inch, w, 0.62 * inch, stroke=0, fill=1)
        c.drawImage(MONO, 0.6 * inch, h - 0.52 * inch, width=0.25 * inch, height=0.42 * inch, mask="auto")
        c.setFillColor(white); c.setFont("Serif", 12.5); c.drawString(0.95 * inch, h - 0.36 * inch, "SENTIENT  PARTNERS")
        c.setFillColor(GOLD); c.setFont("Sans", 7.5); c.drawRightString(w - 0.6 * inch, h - 0.36 * inch, title.upper())
        c.setStrokeColor(GOLD); c.setLineWidth(0.6); c.line(0.6 * inch, 0.62 * inch, w - 0.6 * inch, 0.62 * inch)
        c.setFillColor(MUTED); c.setFont("Sans", 7.5)
        c.drawString(0.6 * inch, 0.42 * inch, f"Sentient Partners  ·  {TAGLINE}")
        c.drawRightString(w - 0.6 * inch, 0.42 * inch, f"sentientpartners.ai  ·  hello@sentientpartners.ai  ·  Page {doc.page}")
    return draw

def doc(path, title, size=letter):
    d = BaseDocTemplate(path, pagesize=size, title=f"{title} | Sentient Partners", author="Sentient Partners",
                        leftMargin=0.6 * inch, rightMargin=0.6 * inch, topMargin=0.95 * inch, bottomMargin=0.85 * inch)
    d.addPageTemplates([PageTemplate(frames=[Frame(d.leftMargin, d.bottomMargin, d.width, d.height, id="f")], onPage=chrome(title))])
    return d

def card(label, text, width):
    t = Table([[Paragraph(label.upper(), S["eyebrow"])], [Paragraph(text, S["script"])]], colWidths=[width])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PAPER), ("LINEBEFORE", (0, 0), (0, -1), 2, GOLD),
                           ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                           ("TOPPADDING", (0, 0), (-1, 0), 7), ("BOTTOMPADDING", (0, -1), (-1, -1), 8)]))
    return KeepTogether([t, Spacer(1, 6)])

def kit(filename, title, sub, intro, sections, closing):
    path = os.path.join(OUT, filename)
    d = doc(path, title)
    story = [Paragraph(title, S["h1"]), Paragraph(sub, S["sub"]), Paragraph(intro, S["body"])]
    for heading, items in sections:
        story.append(Paragraph(heading, S["h2"]))
        for label, text in items:
            story.append(card(label, text, d.width))
    story += [Spacer(1, 6), Paragraph(closing, S["note"])]
    d.build(story)
    return path

# ---- 1. Review request kit ------------------------------------------------------------
kit("review-request-kit.pdf", "Review request kit", "Ask at the right moment. Reply to every review.",
    "Short scripts to copy, edit and send. Replace anything in [brackets]. Keep the link direct, so customers land on the review form in one tap.",
    [
        ("Asking for a review", [
            ("Text, right after the job", "Hi [Name], thanks for choosing [Business] today. If you were happy with the work, a quick review helps neighbors find us: [review link]. Thank you! [Your name]"),
            ("Email, right after the job", "<b>Subject:</b> Thank you from [Business]<br/><br/>Hi [Name],<br/><br/>Thank you for having us out today. If you have a minute, we'd be grateful for a short review. It helps other people in [City] decide who to call.<br/><br/>[review link]<br/><br/>If anything wasn't right, reply to this email and we'll make it right.<br/><br/>[Your name], [Business]"),
            ("Text, follow-up a few days later", "Hi [Name], [Your name] from [Business] again. If you have a moment, we'd really value a review: [review link]. No worries if not, and thanks again."),
            ("Email, follow-up a few days later", "<b>Subject:</b> One quick favor?<br/><br/>Hi [Name], just a gentle reminder in case our last note got buried. A short review of your experience with [Business] would mean a lot: [review link]. Thank you, [Your name]"),
        ]),
        ("Replying to reviews", [
            ("5-star review", "Thank you, [Name]! It was a pleasure working on your [job]. We're glad it turned out the way you wanted, and we're here whenever you need us. [Your name], [Business]"),
            ("Mixed review", "Thank you for the honest feedback, [Name]. We're glad [what went well], and we're sorry [what fell short]. We'd like to hear more and put it right: please call us at [phone] or email [email]. [Your name], [Business]"),
            ("Negative review", "[Name], we're sorry your experience wasn't what you expected. That's not the standard we hold ourselves to. Please contact me directly at [phone] or [email] so I can understand what happened and help. [Your name], [Title], [Business]"),
        ]),
        ("Good habits", [
            ("Keep it simple", "Ask every customer, not just the ones you think are happiest. Send one follow-up, not more. Reply to every review, good and bad, and keep replies short, specific and free of customer details."),
        ]),
    ],
    "Check the review platform's own rules before you ask. For example, don't offer anything in exchange for a review. Questions? hello@sentientpartners.ai")

# ---- 2. Missed-call text-back scripts --------------------------------------------------
kit("missed-call-text-back-scripts.pdf", "Missed-call text-back scripts", "So a missed call becomes a conversation.",
    "Send these automatically when a call goes unanswered, or by hand from the business phone. Replace anything in [brackets]. Only text people who called you, and honor any request to stop.",
    [
        ("When a call is missed", [
            ("After hours", "Hi, this is [Business]. Sorry we missed your call. We're closed right now and back at [opening time]. Reply here with what you need, or book a time that suits you: [booking link]"),
            ("Busy or on a job", "Hi, it's [Business]. Sorry we missed you, we're with a customer right now. Reply with a quick note about what you need and we'll get back to you, or book here: [booking link]"),
            ("Voicemail follow-up", "Hi [Name], thanks for your message to [Business]. [Answer or next step]. If it's easier, you can pick a time here: [booking link]. [Your name]"),
            ("Next-day nudge", "Hi [Name], [Your name] from [Business] following up on your call yesterday. Are you still looking for help with [job]? Happy to help, just reply here or book: [booking link]"),
        ]),
        ("Short versions", [
            ("When space is tight", "[Business]: sorry we missed your call. Reply with what you need or book: [booking link]"),
            ("Closing the loop", "Thanks, [Name]. You're booked for [day] at [time]. Reply here if anything changes. [Business]"),
        ]),
        ("Good habits", [
            ("Keep it human", "Use the business name in the first words so people know who's texting. Ask one question at a time. Only promise a callback time you can keep."),
        ]),
    ],
    "Texting rules vary by place and carrier; check what applies to you before automating. Questions? hello@sentientpartners.ai")

# ---- 3. Weekly owner scorecard ----------------------------------------------------------
ROWS = [
    ("Calls in", "Inbound calls, answered or not", "num"),
    ("Calls missed", "Calls not answered live", "num"),
    ("Leads", "New enquiries from any channel", "num"),
    ("Estimates sent", "Quotes or estimates sent", "num"),
    ("Jobs booked", "Work confirmed with a date", "num"),
    ("Close rate", "Jobs booked ÷ estimates sent (calculated)", "pct"),
    ("Revenue booked", "Value of jobs booked this week", "usd"),
    ("Cash collected", "Payments received this week", "usd"),
    ("Reviews gained", "New reviews on any platform", "num"),
]
WEEKS = 13

def build_xlsx():
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    wb = Workbook(); ws = wb.active; ws.title = "Scorecard"
    navy, gold, paper = "0D1F4E", "C8B795", "F6F3EC"
    ws["A1"] = "Weekly owner scorecard"; ws["A1"].font = Font(name="Georgia", size=18, color=navy)
    ws["A2"] = "Sentient Partners · sentientpartners.ai · hello@sentientpartners.ai"; ws["A2"].font = Font(size=9, color="5B6577")
    ws.append([])
    head = ["Measure", "What to count"] + [f"Week {i}" for i in range(1, WEEKS + 1)]
    ws.append(head); hr = ws.max_row
    ws.append(["Week starting", "Date (e.g. Monday)"] + [""] * WEEKS)
    thin = Side(style="thin", color="D9D4C7")
    for c in ws[hr]:
        c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor=navy); c.alignment = Alignment(horizontal="center", vertical="center")
    first = ws.max_row + 1
    for label, what, kind in ROWS:
        ws.append([label, what] + [""] * WEEKS)
    rownum = {label: first + i for i, (label, _, _) in enumerate(ROWS)}
    for i, (label, what, kind) in enumerate(ROWS):
        r = first + i
        ws.cell(r, 1).font = Font(bold=True, color=navy)
        ws.cell(r, 2).font = Font(size=9, color="5B6577")
        for col in range(3, 3 + WEEKS):
            cell = ws.cell(r, col); L = get_column_letter(col)
            if kind == "pct":
                cell.value = f'=IFERROR({L}{rownum["Jobs booked"]}/{L}{rownum["Estimates sent"]},"")'
                cell.number_format = "0%"; cell.fill = PatternFill("solid", fgColor=paper)
            elif kind == "usd":
                cell.number_format = '"$"#,##0'
            else:
                cell.number_format = "0"
            cell.border = Border(top=thin, bottom=thin, left=thin, right=thin); cell.alignment = Alignment(horizontal="center")
    ws.column_dimensions["A"].width = 18; ws.column_dimensions["B"].width = 38
    for col in range(3, 3 + WEEKS): ws.column_dimensions[get_column_letter(col)].width = 11
    ws.freeze_panes = ws.cell(hr + 1, 3)
    ws.cell(hr + 1, 1).font = Font(italic=True, color="8A7650")
    h = wb.create_sheet("How to use")
    lines = [
        ("How to use this scorecard", True),
        ("1. Pick one time each week (for example, Monday morning) and fill in last week's column.", False),
        ("2. Count from your phone log, inbox, estimates and accounts. Rough but consistent beats perfect.", False),
        ("3. Close rate fills itself in: jobs booked divided by estimates sent.", False),
        ("4. Look across the row, not just the latest week. A trend over a month tells you more than any single week.", False),
        ("5. Pick one number to improve next, and one change to try.", False),
        ("", False),
        ("Questions or want help setting this up? hello@sentientpartners.ai · sentientpartners.ai", False),
    ]
    for i, (t, bold) in enumerate(lines, 1):
        c = h.cell(i, 1, t); c.font = Font(name="Georgia" if bold else None, size=16 if bold else 11, color=navy if bold else "1B2333")
    h.column_dimensions["A"].width = 110
    path = os.path.join(OUT, "weekly-owner-scorecard.xlsx"); wb.save(path); return path

def build_csv():
    path = os.path.join(OUT, "weekly-owner-scorecard.csv")
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Measure", "What to count"] + [f"Week {i}" for i in range(1, WEEKS + 1)])
        w.writerow(["Week starting", "Date (e.g. Monday)"] + [""] * WEEKS)
        for label, what, kind in ROWS:
            w.writerow([label, what] + [""] * WEEKS)
    return path

def build_scorecard_pdf():
    path = os.path.join(OUT, "weekly-owner-scorecard.pdf")
    d = doc(path, "Weekly owner scorecard", landscape(letter))
    weeks = 8
    data = [["Measure"] + [f"Week {i}" for i in range(1, weeks + 1)], ["Week starting"] + [""] * weeks]
    data += [[Paragraph(f"<b>{l}</b><br/><font size=7 color='#5B6577'>{w}</font>", S["script"])] + [""] * weeks for l, w, _ in ROWS]
    first_w = 2.6 * inch
    t = Table(data, colWidths=[first_w] + [(d.width - first_w) / weeks] * weeks, rowHeights=[22, 22] + [34] * len(ROWS))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), white), ("FONTNAME", (0, 0), (-1, 0), "SansBold"),
        ("FONTSIZE", (0, 0), (-1, 1), 8.5), ("FONTNAME", (0, 1), (0, 1), "SansBold"), ("TEXTCOLOR", (0, 1), (0, 1), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#D9D4C7")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (1, 0), (-1, 0), "CENTER"),
        ("BACKGROUND", (1, 7), (-1, 7), PAPER),
    ]))
    d.build([Paragraph("Weekly owner scorecard", S["h1"]),
             Paragraph("Fill in one column a week. Close rate = jobs booked ÷ estimates sent.", S["note"]), Spacer(1, 4), t])
    return path

for p in [build_xlsx(), build_csv(), build_scorecard_pdf()]:
    pass
print("\n".join(sorted(os.listdir(OUT))))
