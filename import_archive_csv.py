import csv
import requests
import sys
from datetime import datetime

# API endpoint - Production Render URL
API_URL = "https://wki-wip-api.onrender.com/api/orders"

def parse_date(date_str):
    """Parse date string to ISO format"""
    if not date_str or date_str.strip() == '':
        return None
    
    # Try common date formats
    formats = ['%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d', '%m-%d-%Y']
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.isoformat()
        except:
            continue
    return None

def import_archive_csv(csv_file, archive_month):
    """Import CSV data and archive to specified month"""
    
    print(f"\nImporting {csv_file} to archive: {archive_month}")
    
    # Define column headers manually
    headers = ['Customer', 'UNIT', 'R.O.', 'Bay #', 'First Shift Notes', 'Second Shift Notes', 
               'Ordered parts/ETA and TCS case #s', 'Triage Notes ', 'Quote Status', 
               'Repair Condition', 'Contact Info', 'Account Status', 'Customer Status', 'Call']
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        csv_reader = csv.reader(file)
        
        imported_count = 0
        skipped_count = 0
        
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
                "call": row.get('Call', '').strip()
            }
            
            try:
                # First, create the order
                response = requests.post(f"{API_URL}", json=order_data, timeout=30)
                
                if response.status_code in [200, 201]:
                    order_id = response.json().get('_id')
                    
                    if not order_id:
                        print(f"[FAIL] No order ID returned for: {order_data['customer']}")
                        continue
                    
                    # Then archive it to the specified month
                    archive_response = requests.post(
                        f"{API_URL}/{order_id}/archive",
                        json={"archiveMonth": archive_month},
                        timeout=30
                    )
                    
                    if archive_response.status_code == 200:
                        imported_count += 1
                        print(f"[OK] Imported and archived: {order_data['customer']} - RO #{order_data['roNumber']}")
                    else:
                        print(f"[FAIL] Failed to archive: {order_data['customer']} - Status: {archive_response.status_code}, Error: {archive_response.text}")
                else:
                    print(f"[FAIL] Failed to create order: {order_data['customer']} - Status: {response.status_code}, Error: {response.text[:200]}")
                    
            except requests.exceptions.Timeout:
                print(f"[TIMEOUT] {order_data['customer']}")
            except Exception as e:
                print(f"[ERROR] {order_data['customer']}: {str(e)}")
        
        print(f"\n[COMPLETE] Import finished!")
        print(f"  - Imported and archived: {imported_count}")
        print(f"  - Skipped (empty rows): {skipped_count}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python import_archive_csv.py <csv_file> <archive_month>")
        print("Example: python import_archive_csv.py 'Service Dept Sheets - November 2025.csv' 'November 2025'")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    archive_month = sys.argv[2]
    
    import_archive_csv(csv_file, archive_month)
