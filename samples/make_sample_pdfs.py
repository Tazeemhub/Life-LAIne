"""
Generates valid PDF files for the sample medical records using only Python standard library.
"""
import os

def create_simple_pdf(text_lines: list[str], output_path: str):
    """Generates a multi-line valid PDF-1.4 file using standard library."""
    # Escape special characters in text
    def escape_pdf(s: str) -> str:
        return s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

    # Build content stream
    content_lines = ["BT", "/F1 9 Tf", "12 TL", "40 780 Td"]
    first = True
    for line in text_lines:
        line_clean = line.strip('\r\n')
        # Truncate very long lines if any
        if len(line_clean) > 95:
            line_clean = line_clean[:92] + "..."
        escaped = escape_pdf(line_clean)
        if first:
            content_lines.append(f"({escaped}) Tj")
            first = False
        else:
            content_lines.append(f"T* ({escaped}) Tj")
    content_lines.append("ET")
    
    stream_content = "\n".join(content_lines).encode("latin-1", errors="replace")
    stream_len = len(stream_content)

    objects = []
    # 1: Catalog
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")
    # 2: Pages
    objects.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj")
    # 3: Page
    objects.append(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj")
    # 4: Stream
    objects.append(f"4 0 obj\n<< /Length {stream_len} >>\nstream\n".encode("latin-1") + stream_content + b"\nendstream\nendobj")
    # 5: Font
    objects.append(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj")

    # Assemble PDF with cross-reference table
    output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(output))
        output.extend(obj + b"\n")

    xref_offset = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))

    output.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("latin-1"))

    with open(output_path, "wb") as f:
        f.write(output)


def main():
    samples_dir = os.path.dirname(os.path.abspath(__file__))
    files = [
        ("sample_prescription.txt", "sample_prescription.pdf"),
        ("sample_lab_report.txt", "sample_lab_report.pdf"),
        ("sample_discharge_summary.txt", "sample_discharge_summary.pdf"),
    ]
    for txt_name, pdf_name in files:
        txt_path = os.path.join(samples_dir, txt_name)
        pdf_path = os.path.join(samples_dir, pdf_name)
        if os.path.exists(txt_path):
            with open(txt_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            create_simple_pdf(lines, pdf_path)
            print(f"Generated {pdf_name} ({os.path.getsize(pdf_path)} bytes)")

if __name__ == "__main__":
    main()
