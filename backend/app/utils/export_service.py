import io
from datetime import datetime
from backend.app.utils.datetime_utils import to_wib, utc_now
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_excel(visitors, institution_name="SEAMOLEC"):
    wb = Workbook()
    ws = wb.active
    ws.title = "Laporan Kunjungan"

    title_font = Font(name="Arial", size=14, bold=True, color="650015")
    ws.merge_cells("A1:I1")
    ws["A1"] = f"LAPORAN KUNJUNGAN TAMU — {institution_name.upper()}"
    ws["A1"].font = title_font
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")

    now_str = to_wib(utc_now()).strftime("%d/%m/%Y %H:%M WIB")
    ws.merge_cells("A2:I2")
    ws["A2"] = f"Dicetak pada: {now_str} | Total: {len(visitors)} Pengunjung"
    ws["A2"].font = Font(name="Arial", size=9, italic=True, color="555555")
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center")

    headers = [
        "No",
        "Tanggal",
        "Jam Masuk",
        "Jam Keluar",
        "Nama Tamu",
        "Instansi",
        "No. Pass",
        "Keperluan",
        "Resepsionis",
    ]

    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="8A001A", end_color="8A001A", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    thin_border = Border(
        left=Side(style="thin", color="CCCCCC"),
        right=Side(style="thin", color="CCCCCC"),
        top=Side(style="thin", color="CCCCCC"),
        bottom=Side(style="thin", color="CCCCCC")
    )

    ws.append([])
    ws.append(headers)

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border

    data_font = Font(name="Arial", size=9)
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center")

    for idx, v in enumerate(visitors, start=1):
        cin = v.get("check_in_at")
        cout = v.get("check_out_at")
        
        tgl_str = "-"
        cin_str = "-"
        cout_str = "-"

        if cin:
            try:
                dt_cin = to_wib(datetime.fromisoformat(cin.replace("Z", "+00:00")))
                tgl_str = dt_cin.strftime("%d/%m/%Y")
                cin_str = dt_cin.strftime("%H:%M")
            except Exception:
                tgl_str = cin[:10]
                cin_str = cin[11:16]

        if cout:
            try:
                dt_cout = to_wib(datetime.fromisoformat(cout.replace("Z", "+00:00")))
                cout_str = dt_cout.strftime("%H:%M")
            except Exception:
                cout_str = cout[11:16]
        else:
            cout_str = "Di Lokasi" if v.get("status") == "APPROVED" else "-"

        row_data = [
            idx,
            tgl_str,
            cin_str,
            cout_str,
            v.get("fullname", "-"),
            v.get("institution", "-") or "-",
            f"Pass #{v.get('no_pass') or v.get('id_pass', '-')}",
            v.get("purpose", "-") or "-",
            v.get("approved_by") or v.get("rejected_by") or ("Petugas" if v.get("status") == "APPROVED" else "-"),
        ]
        ws.append(row_data)
        current_row = 4 + idx
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=current_row, column=col_idx)
            cell.font = data_font
            cell.border = thin_border
            if col_idx in [1, 2, 3, 4, 7]:
                cell.alignment = center_align
            else:
                cell.alignment = left_align

    col_widths = {
        "A": 6,
        "B": 13,
        "C": 12,
        "D": 12,
        "E": 24,
        "F": 22,
        "G": 14,
        "H": 28,
        "I": 20,
    }
    for col_letter, width in col_widths.items():
        ws.column_dimensions[col_letter].width = width

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf

def generate_pdf(visitors, institution_name="SEAMOLEC"):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=20,
        rightMargin=20,
        topMargin=20,
        bottomMargin=20
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "PDFTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#650015"),
        alignment=1
    )
    sub_style = ParagraphStyle(
        "PDFSub",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#555555"),
        alignment=1
    )
    cell_style = ParagraphStyle(
        "PDFCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10
    )
    cell_center = ParagraphStyle(
        "PDFCellCenter",
        parent=cell_style,
        alignment=1
    )
    head_style = ParagraphStyle(
        "PDFHead",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=1
    )

    elements = []
    elements.append(Paragraph(f"LAPORAN KUNJUNGAN BUKU TAMU DIGITAL — {institution_name.upper()}", title_style))
    now_str = to_wib(utc_now()).strftime("%d/%m/%Y %H:%M WIB")
    elements.append(Paragraph(f"Waktu Cetak: {now_str} | Total: {len(visitors)} Pengunjung", sub_style))
    elements.append(Spacer(1, 14))

    table_data = [[
        Paragraph("No", head_style),
        Paragraph("Tanggal", head_style),
        Paragraph("Masuk", head_style),
        Paragraph("Keluar", head_style),
        Paragraph("Nama Tamu", head_style),
        Paragraph("Instansi", head_style),
        Paragraph("Pass", head_style),
        Paragraph("Keperluan", head_style),
        Paragraph("Resepsionis", head_style),
    ]]

    for idx, v in enumerate(visitors, start=1):
        cin = v.get("check_in_at")
        cout = v.get("check_out_at")
        
        tgl_str = "-"
        cin_str = "-"
        cout_str = "-"

        if cin:
            try:
                dt_cin = to_wib(datetime.fromisoformat(cin.replace("Z", "+00:00")))
                tgl_str = dt_cin.strftime("%d/%m/%Y")
                cin_str = dt_cin.strftime("%H:%M")
            except Exception:
                tgl_str = cin[:10]
                cin_str = cin[11:16]

        if cout:
            try:
                dt_cout = to_wib(datetime.fromisoformat(cout.replace("Z", "+00:00")))
                cout_str = dt_cout.strftime("%H:%M")
            except Exception:
                cout_str = cout[11:16]
        else:
            cout_str = "Di Lokasi" if v.get("status") == "APPROVED" else "-"

        table_data.append([
            Paragraph(str(idx), cell_center),
            Paragraph(tgl_str, cell_center),
            Paragraph(cin_str, cell_center),
            Paragraph(cout_str, cell_center),
            Paragraph(v.get("fullname", "-"), cell_style),
            Paragraph(v.get("institution", "-") or "-", cell_style),
            Paragraph(f"#{v.get('no_pass') or v.get('id_pass', '-')}", cell_center),
            Paragraph(v.get("purpose", "-") or "-", cell_style),
            Paragraph(v.get("approved_by") or v.get("rejected_by") or ("Petugas" if v.get("status") == "APPROVED" else "-"), cell_style),
        ])

    col_widths = [25, 55, 40, 45, 115, 120, 45, 210, 95]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8A001A")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D5CEC5")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF7F0")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    elements.append(table)
    doc.build(elements)
    buf.seek(0)
    return buf
