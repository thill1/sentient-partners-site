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
from reportlab.graphics.shapes import Drawing, Rect

def tickbox():
    d = Drawing(10, 10); d.add(Rect(0.5, 0.5, 9, 9, strokeColor=HexColor("#8A7650"), fillColor=None, strokeWidth=0.8)); return d

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

# ---- 4. Estimate and quote template ------------------------------------------------------
EST_LINES = 12
FOLLOW_UP = [
    ("Day estimate is sent", "Send the estimate with a short note and the one next step to accept."),
    ("2 days later", "Check it arrived and ask if there are any questions."),
    ("1 week later", "Offer to adjust scope or timing if needed."),
    ("2 weeks later", "A last friendly check-in; then mark it won, lost or on hold."),
]

def build_estimate_xlsx():
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    wb = Workbook(); ws = wb.active; ws.title = "Estimate"
    navy, paper = "0D1F4E", "F6F3EC"
    thin = Side(style="thin", color="D9D4C7"); box = Border(top=thin, bottom=thin, left=thin, right=thin)
    ws["A1"] = "[Your business name]"; ws["A1"].font = Font(name="Georgia", size=18, color=navy)
    ws["A2"] = "[Address] · [Phone] · [Email] · [Website]"; ws["A2"].font = Font(size=9, color="5B6577")
    ws["E1"] = "ESTIMATE"; ws["E1"].font = Font(bold=True, size=14, color=navy); ws["E1"].alignment = Alignment(horizontal="right")
    info = [("Estimate #", "[0001]"), ("Date", "[Date]"), ("Valid until", "[Date]")]
    for i, (k, v) in enumerate(info):
        ws.cell(2 + i, 4, k).font = Font(bold=True, color=navy); ws.cell(2 + i, 5, v)
    ws["A6"] = "Prepared for"; ws["A6"].font = Font(bold=True, color=navy)
    for i, t in enumerate(["[Customer name]", "[Address]", "[Phone / email]"]): ws.cell(7 + i, 1, t)
    hr = 11
    for j, h in enumerate(["Description", "", "Qty", "Unit price", "Amount"], 1):
        c = ws.cell(hr, j, h); c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor=navy)
    ws.merge_cells(start_row=hr, start_column=1, end_row=hr, end_column=2)
    for r in range(hr + 1, hr + 1 + EST_LINES):
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2)
        ws.cell(r, 3).number_format = "0.##"; ws.cell(r, 4).number_format = '"$"#,##0.00'
        ws.cell(r, 5, f'=IF(AND(C{r}<>"",D{r}<>""),C{r}*D{r},"")').number_format = '"$"#,##0.00'
        for col in range(1, 6): ws.cell(r, col).border = box
    ws.cell(hr + 1, 1, "[Line item, e.g. labor]")
    last = hr + EST_LINES; t = last + 2
    rows = [("Subtotal", f"=SUM(E{hr+1}:E{last})"), ("Tax rate", 0), ("Tax", f"=E{t}*E{t+1}"), ("Total", f"=E{t}+E{t+2}")]
    for i, (k, v) in enumerate(rows):
        r = t + i; ws.cell(r, 4, k).font = Font(bold=True, color=navy); c = ws.cell(r, 5, v)
        c.number_format = "0.00%" if k == "Tax rate" else '"$"#,##0.00'; c.border = box
        if k == "Tax rate": c.fill = PatternFill("solid", fgColor=paper)
        if k == "Total": c.font = Font(bold=True, size=12, color=navy)
    ws.cell(t + 1, 6, "← enter your rate").font = Font(size=8, color="5B6577")
    tr = t + 6
    ws.cell(tr, 1, "Terms").font = Font(bold=True, color=navy)
    for i, line in enumerate(["[Payment terms, e.g. deposit and when the balance is due]", "[What's included and not included]", "[Warranty or guarantee, if any]", "[How to accept: sign below or reply to this email]"]):
        ws.cell(tr + 1 + i, 1, line)
    ws.cell(tr + 6, 1, "Accepted by: ______________________     Date: __________")
    ws.column_dimensions["A"].width = 30; ws.column_dimensions["B"].width = 18
    for col, wdt in zip("CDEF", [8, 14, 16, 18]): ws.column_dimensions[col].width = wdt
    fu = wb.create_sheet("Follow-up schedule")
    fu["A1"] = "Follow-up schedule (a suggestion; adjust to suit)"; fu["A1"].font = Font(name="Georgia", size=15, color=navy)
    for j, h in enumerate(["When", "What to do", "Done"], 1):
        c = fu.cell(3, j, h); c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor=navy)
    for i, (w, d) in enumerate(FOLLOW_UP):
        fu.cell(4 + i, 1, w); fu.cell(4 + i, 2, d); fu.cell(4 + i, 3, "☐")
    fu.column_dimensions["A"].width = 22; fu.column_dimensions["B"].width = 70; fu.column_dimensions["C"].width = 8
    fu["A10"] = "Sentient Partners · sentientpartners.ai · hello@sentientpartners.ai"; fu["A10"].font = Font(size=9, color="5B6577")
    path = os.path.join(OUT, "estimate-quote-template.xlsx"); wb.save(path); return path

def build_estimate_pdf():
    path = os.path.join(OUT, "estimate-quote-template.pdf")
    d = doc(path, "Estimate and quote template")
    head = Table([[Paragraph("<b>[Your business name]</b><br/>[Address]<br/>[Phone] · [Email]", S["script"]),
                   Paragraph("<b>ESTIMATE</b><br/>Estimate # [0001]<br/>Date [ ]<br/>Valid until [ ]", S["script"])]], colWidths=[d.width * 0.6, d.width * 0.4])
    cust = Paragraph("<b>Prepared for</b><br/>[Customer name] · [Address] · [Phone / email]", S["script"])
    lines = [["Description", "Qty", "Unit price", "Amount"]] + [["", "", "", ""] for _ in range(8)]
    lines += [["", "", "Subtotal", ""], ["", "", "Tax ( %)", ""], ["", "", "Total", ""]]
    t = Table(lines, colWidths=[d.width * 0.55, d.width * 0.1, d.width * 0.17, d.width * 0.18], rowHeights=[20] + [20] * 11)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), white), ("FONTNAME", (0, 0), (-1, -1), "Sans"),
        ("FONTNAME", (0, 0), (-1, 0), "SansBold"), ("FONTSIZE", (0, 0), (-1, -1), 8.5), ("GRID", (0, 0), (-1, 8), 0.5, HexColor("#D9D4C7")),
        ("GRID", (2, 9), (-1, -1), 0.5, HexColor("#D9D4C7")), ("FONTNAME", (2, 9), (2, -1), "SansBold"), ("TEXTCOLOR", (2, 9), (2, -1), NAVY),
        ("BACKGROUND", (2, 11), (-1, 11), PAPER), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    fu = Table([["When", "What to do", "Done"]] + [[w, Paragraph(x, S["script"]), tickbox()] for w, x in FOLLOW_UP], colWidths=[d.width * 0.22, d.width * 0.68, d.width * 0.1])
    fu.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), white), ("FONTNAME", (0, 0), (-1, -1), "Sans"),
        ("FONTNAME", (0, 0), (-1, 0), "SansBold"), ("FONTSIZE", (0, 0), (-1, -1), 8.5), ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#D9D4C7")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    d.build([Paragraph("Estimate and quote template", S["h1"]), head, Spacer(1, 8), cust, Spacer(1, 10), t,
             Paragraph("Terms", S["h2"]), Paragraph("[Payment terms] · [What's included and not included] · [Warranty, if any] · [How to accept]", S["body"]),
             Paragraph("Accepted by: ______________________________&nbsp;&nbsp;&nbsp; Date: ____________", S["body"]),
             Paragraph("Follow-up schedule (a suggestion; adjust to suit)", S["h2"]), fu])
    return path

# ---- 5. Automation starter checklist -----------------------------------------------------
CHECKLIST = [
    ("Missed-call text-back", "Calling people back hours later, or never."),
    ("Online booking with reminders", "Phone tag to find a time, and reminder calls."),
    ("Quote follow-ups", "Remembering to chase every estimate."),
    ("Review requests after each job", "Asking in person, if at all."),
    ("Invoices from the job record, paid online", "Typing invoices and waiting on checks."),
    ("Payment reminders", "Awkward calls about overdue bills."),
    ("Leads into one list", "Copying form emails and voicemails into a spreadsheet."),
    ("Confirmations and on-my-way texts", "Texting each customer by hand."),
    ("Syncing customers between tools", "Retyping the same details in two or three places."),
    ("A weekly numbers summary", "Pulling figures together by hand, or not at all."),
]

def build_checklist_pdf():
    path = os.path.join(OUT, "automation-starter-checklist.pdf")
    d = doc(path, "Automation starter checklist")
    rows = [["", "#", "Automate", "What it replaces"]] + [[tickbox(), str(i), Paragraph(f"<b>{a}</b>", S["script"]), Paragraph(r, S["script"])] for i, (a, r) in enumerate(CHECKLIST, 1)]
    t = Table(rows, colWidths=[0.35 * inch, 0.35 * inch, d.width * 0.4, d.width - 0.7 * inch - d.width * 0.4])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), white), ("FONTNAME", (0, 0), (-1, -1), "Sans"),
        ("FONTNAME", (0, 0), (-1, 0), "SansBold"), ("FONTSIZE", (0, 0), (-1, -1), 9), ("TEXTCOLOR", (1, 1), (1, -1), HexColor("#8A7650")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, PAPER]), ("LINEBELOW", (0, 0), (-1, -1), 0.5, HexColor("#D9D4C7")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 1), (-1, -1), 8), ("BOTTOMPADDING", (0, 1), (-1, -1), 8)]))
    d.build([Paragraph("Automation starter checklist", S["h1"]), Paragraph("The first ten things to automate, in order.", S["sub"]),
             Paragraph("Work down the list. Do one at a time, check it works for a couple of weeks, then move on.", S["body"]),
             Spacer(1, 6), t, Spacer(1, 10),
             Paragraph("Keep a person in the loop for anything a customer sees until you trust it. Questions? hello@sentientpartners.ai", S["note"])])
    return path

# ---- 6. AI use policy for small teams ----------------------------------------------------
POLICY = [
    ("Why we have this", ["AI tools can save us time. This page sets out how we use them safely, so customer trust and our own information stay protected."]),
    ("Fine to use AI for", ["Drafting emails, posts and replies that a person reviews before sending.", "Summarising our own non-confidential notes, manuals or public information.", "Brainstorming, checklists, outlines and rewording.", "Explaining a topic or a spreadsheet formula."]),
    ("Never put into AI tools", ["Customer names with contact details, addresses, or account numbers.", "Card, bank, payment or ID details of anyone.", "Passwords, access codes or keys.", "Health, legal or HR matters about any person.", "Contracts, pricing or anything we've agreed to keep confidential."]),
    ("Always", ["Use only the tools listed below, with a work account.", "Check facts, figures and names before anything goes out.", "Stay responsible for the final wording; AI drafts, people decide.", "Ask if you're unsure, before you paste."]),
    ("Approved tools", ["[Tool name] for [use]", "[Tool name] for [use]"]),
    ("Questions", ["Ask [owner or manager name] at [email]. We review this policy every [6 months] on [date]."]),
]
POLICY_NOTE = "This is a plain-English starting point, not legal advice. Check local rules and any industry requirements that apply to your business."

def build_policy_pdf():
    path = os.path.join(OUT, "ai-use-policy.pdf")
    d = doc(path, "AI use policy")
    story = [Paragraph("AI use policy for [Business]", S["h1"]), Paragraph("What we can and can't put into AI tools.", S["sub"])]
    for h, items in POLICY:
        story.append(Paragraph(h, S["h2"]))
        story += [Paragraph(("• " if len(items) > 1 else "") + i, S["body"]) for i in items]
    story += [Spacer(1, 6), Paragraph(POLICY_NOTE, S["note"])]
    d.build(story); return path

def build_policy_docx():
    from docx import Document
    from docx.shared import Pt, RGBColor
    navy, gold = RGBColor(0x0D, 0x1F, 0x4E), RGBColor(0x8A, 0x76, 0x50)
    doc_ = Document()
    st = doc_.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(10.5)
    t = doc_.add_paragraph(); r = t.add_run("AI use policy for [Business]"); r.font.size = Pt(22); r.font.color.rgb = navy; r.font.name = "Georgia"
    s = doc_.add_paragraph(); r = s.add_run("What we can and can't put into AI tools."); r.italic = True; r.font.color.rgb = gold
    for h, items in POLICY:
        p = doc_.add_paragraph(); r = p.add_run(h); r.bold = True; r.font.size = Pt(13); r.font.color.rgb = navy
        for i in items:
            doc_.add_paragraph(i, style="List Bullet" if len(items) > 1 else None)
    n = doc_.add_paragraph(); r = n.add_run(POLICY_NOTE); r.italic = True; r.font.size = Pt(9)
    sec = doc_.sections[0]
    fp = sec.footer.paragraphs[0]; fr = fp.add_run("Template from Sentient Partners · sentientpartners.ai · hello@sentientpartners.ai"); fr.font.size = Pt(8)
    path = os.path.join(OUT, "ai-use-policy.docx"); doc_.save(path); return path

for p in [build_estimate_xlsx(), build_estimate_pdf(), build_checklist_pdf(), build_policy_pdf(), build_policy_docx()]:
    pass

print("\n".join(sorted(os.listdir(OUT))))
