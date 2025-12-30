import pdfplumber

with pdfplumber.open('public/testwip.pdf') as pdf:
    print(f"Number of pages: {len(pdf.pages)}\n")
    
    for i, page in enumerate(pdf.pages):
        print(f"\n--- PAGE {i+1} INFO ---")
        print(f"Width: {page.width}, Height: {page.height}")
        
        # Try to extract tables
        tables = page.extract_tables()
        if tables:
            print(f"Found {len(tables)} tables")
            for j, table in enumerate(tables):
                print(f"\nTable {j+1}:")
                for row in table[:10]:  # First 10 rows
                    print(row)
        
        # Check for images
        images = page.images
        if images:
            print(f"Found {len(images)} images")
        
        # Try to get text with different settings
        text = page.extract_text(x_tolerance=3, y_tolerance=3)
        if text and text.strip():
            print(f"\nExtracted text:\n{text[:500]}")
