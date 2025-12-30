import csv
import requests
import json
import time
from datetime import datetime

# API Configuration
API_URL = "https://wki-wip-api.onrender.com/api"  # Production
# API_URL = "http://localhost:3001/api"  # Local testing

print("🚀 Starting CSV Import to MongoDB via API...")
print(f"📡 Target: {API_URL}/orders\n")

# Read CSV file
csv_file = 'current_wip.csv'
orders = []

with open(csv_file, 'r', encoding='utf-8') as f:
    csv_reader = csv.DictReader(f)
    
    for row in csv_reader:
        # Skip rows with separator markers or empty customer names
        customer = row.get('Customer', '').strip()
        
        # Skip if customer is empty or contains only special characters
        if not customer or customer.startswith('>') or customer.startswith('<'):
            continue
        
        # Map CSV columns to database schema
        order = {
            'customer': customer,
            'unit': row.get('UNIT', '').strip(),
            'ro': row.get('R.O.', '').strip(),
            'bay': row.get('Bay #', '').strip(),
            'firstShift': row.get('First Shift Notes', '').strip(),
            'secondShift': row.get('Second Shift Notes', '').strip(),
            'orderedParts': row.get('Ordered parts/ETA and TCS case #s', '').strip(),
            'triageNotes': row.get('Triage Notes ', '').strip(),  # Note the space in the CSV header
            'quoteStatus': row.get('Quote Status', '').strip(),
            'repairCondition': row.get('Repair Condition', '').strip(),
            'contactInfo': row.get('Contact Info', '').strip(),
            'accountStatus': row.get('Account Status', '').strip(),
            'customerStatus': row.get('Customer Status', '').strip(),
            'call': row.get('Call', '').strip(),
            'dateAdded': datetime.now().strftime('%Y-%m-%d')
        }
        
        # Only add if required fields are present
        if order['customer'] and order['unit'] and order['ro']:
            orders.append(order)

print(f"📊 Found {len(orders)} valid orders in CSV\n")

# Optional: Save to JSON file for backup
with open('parsed_orders.json', 'w', encoding='utf-8') as f:
    json.dump(orders, f, indent=2, ensure_ascii=False)
print(f"💾 Backup saved to parsed_orders.json\n")

# Upload to API
success_count = 0
error_count = 0
errors = []

print("=" * 100)
print(f"{'#':<4} {'Customer':<35} {'Unit':<10} {'RO':<10} {'Status':<10}")
print("=" * 100)

for idx, order in enumerate(orders, 1):
    try:
        response = requests.post(f"{API_URL}/orders", json=order, timeout=10)
        
        if response.status_code in [200, 201]:
            success_count += 1
            status = f"✅ {response.status_code}"
        else:
            error_count += 1
            status = f"❌ {response.status_code}"
            errors.append({
                'index': idx,
                'customer': order['customer'],
                'ro': order['ro'],
                'status_code': response.status_code,
                'error': response.text
            })
        
        print(f"{idx:<4} {order['customer'][:34]:<35} {order['unit'][:9]:<10} {order['ro'][:9]:<10} {status:<10}")
        
        # Small delay to avoid overwhelming the server
        time.sleep(0.1)
        
    except Exception as e:
        error_count += 1
        status = f"❌ Exception"
        errors.append({
            'index': idx,
            'customer': order['customer'],
            'ro': order['ro'],
            'error': str(e)
        })
        print(f"{idx:<4} {order['customer'][:34]:<35} {order['unit'][:9]:<10} {order['ro'][:9]:<10} {status:<10}")

print("=" * 100)
print(f"\n📊 Upload Complete!")
print(f"✅ Success: {success_count}")
print(f"❌ Errors: {error_count}")
print(f"📈 Total Processed: {len(orders)}")
print("=" * 100)

# Print detailed error information if any
if errors:
    print("\n❌ Error Details:")
    print("=" * 100)
    for error in errors:
        print(f"\n#{error['index']} - {error['customer']} (RO: {error['ro']})")
        if 'status_code' in error:
            print(f"   Status Code: {error['status_code']}")
        print(f"   Error: {error['error']}")
    print("=" * 100)
