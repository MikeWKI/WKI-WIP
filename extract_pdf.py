import PyPDF2

pdf_file = open('public/testwip.pdf', 'rb')
reader = PyPDF2.PdfReader(pdf_file)

print(f"Number of pages: {len(reader.pages)}\n")
print("="*80)

for i, page in enumerate(reader.pages):
    text = page.extract_text()
    print(f"\n--- PAGE {i+1} ---\n")
    print(text)
    print("\n" + "="*80)

pdf_file.close()
