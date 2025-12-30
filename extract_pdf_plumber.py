import pdfplumber

with pdfplumber.open('public/testwip.pdf') as pdf:
    print(f"Number of pages: {len(pdf.pages)}\n")
    print("="*80)
    
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        print(f"\n--- PAGE {i+1} ---\n")
        print(text)
        print("\n" + "="*80)
