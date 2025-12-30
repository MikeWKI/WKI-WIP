import csv
import requests
import sys
from datetime import datetime

# API endpoint - Production Render URL
API_URL = "https://wki-wip-api.onrender.com/api"

def import_direct_archives(csv_file, archive_month):
    """Import CSV data directly to archives (no intermediate create step)"""
    
    print(f"\nImporting {csv_file} to archive: {archive_month}")
    print("This will add orders directly to the archive collection.")
    
    # Define column headers manually (CSV has no header row)
    headers = ['Customer', 'UNIT', 'R.O.', 'Bay #', 'First Shift Notes', 'Second Shift Notes', 
               'Ordered parts/ETA and TCS case #s', 'Triage Notes ', 'Quote Status', 
               'Repair Condition', 'Contact Info', 'Account Status', 'Customer Status', 'Call']
    
    orders_to_archive = []
    skipped_count = 0
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        csv_reader = csv.reader(file)
        
        for row_data in csv_reader:
            # Skip empty rows or rows with no customer
            if len(row_data) == 0 or not row_data[0] or row_data[0].strip() == '':
                skipped_count += 1
                continue
            
            # Create dict from row data
            row = {}
            for i, header in enumerate(headers):
                if i < len(row_data):
                    row[header] = row_data[i]
                else:
                    row[header] = ''
            
            # Prepare order data
            order_data = {
                "customer": row.get('Customer', '').strip(),
                "unit": row.get('UNIT', '').strip(),
                "roNumber": row.get('R.O.', '').strip(),
                "bayNumber": row.get('Bay #', '').strip(),
                "firstShiftNotes": row.get('First Shift Notes', '').strip(),
                "secondShiftNotes": row.get('Second Shift Notes', '').strip(),
                "orderedParts": row.get('Ordered parts/ETA and TCS case #s', '').strip(),
                "triageNotes": row.get('Triage Notes ', '').strip(),
                "quoteStatus": row.get('Quote Status', '').strip(),
                "repairCondition": row.get('Repair Condition', '').strip(),
                "contactInfo": row.get('Contact Info', '').strip(),
                "accountStatus": row.get('Account Status', '').strip(),
                "customerStatus": row.get('Customer Status', '').strip(),
                "call": row.get('Call', '').strip(),
                "archiveMonth": archive_month,
                "completedAt": datetime.now().isoformat()
            }
            
            orders_to_archive.append(order_data)
    
    print(f"Found {len(orders_to_archive)} orders to archive")
    print(f"Skipped {skipped_count} empty rows")
    
    # Send to bulk archive endpoint
    try:
        response = requests.post(
            f"{API_URL}/archives/bulk",
            json={"orders": orders_to_archive},
            timeout=120
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"\n[SUCCESS] Bulk import completed!")
            print(f"  - Archived: {result.get('archived', len(orders_to_archive))}")
            if 'duplicates' in result:
                print(f"  - Duplicates skipped: {result.get('duplicates', 0)}")
        else:
            print(f"\n[FAIL] Bulk import failed - Status: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        print("\nNote: The bulk endpoint may not exist. The archives may need to be imported individually")
        print("or manually added to the database.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python import_direct_archives.py <csv_file> <archive_month>")
        print("Example: python import_direct_archives.py 'Service Dept Sheets - November 2025.csv' 'November 2025'")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    archive_month = sys.argv[2]
    
    import_direct_archives(csv_file, archive_month)
