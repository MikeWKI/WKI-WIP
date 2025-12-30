import requests
import json
from collections import defaultdict

# API Configuration
API_URL = "https://wki-wip-api.onrender.com/api"

print("🔍 Checking for duplicate orders in database...\n")

# Fetch all orders
try:
    response = requests.get(f"{API_URL}/orders", timeout=30)
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch orders. Status: {response.status_code}")
        exit(1)
    
    orders = response.json()
    print(f"📊 Total orders in database: {len(orders)}\n")
    
except Exception as e:
    print(f"❌ Error fetching orders: {str(e)}")
    exit(1)

# Group orders by RO number
ro_groups = defaultdict(list)
for order in orders:
    ro_number = order.get('ro', '').strip()
    if ro_number:  # Only count non-empty RO numbers
        ro_groups[ro_number].append(order)

# Find duplicates
duplicates = {ro: orders_list for ro, orders_list in ro_groups.items() if len(orders_list) > 1}

if not duplicates:
    print("✅ No duplicates found! Database is clean.\n")
else:
    print(f"⚠️  Found {len(duplicates)} duplicate RO numbers:\n")
    print("=" * 120)
    print(f"{'RO Number':<12} {'Count':<8} {'Customers':<40} {'IDs':<50}")
    print("=" * 120)
    
    total_duplicate_records = 0
    duplicate_details = []
    
    for ro, orders_list in sorted(duplicates.items()):
        count = len(orders_list)
        total_duplicate_records += count - 1  # Subtract 1 because we keep one copy
        
        customers = ' | '.join([o.get('customer', 'N/A')[:18] for o in orders_list[:3]])
        if count > 3:
            customers += '...'
        
        ids = ', '.join([o.get('_id', o.get('id', 'N/A'))[:8] for o in orders_list[:3]])
        if count > 3:
            ids += '...'
        
        print(f"{ro:<12} {count:<8} {customers:<40} {ids:<50}")
        
        # Store details for removal script
        duplicate_details.append({
            'ro': ro,
            'count': count,
            'orders': orders_list
        })
    
    print("=" * 120)
    print(f"\n📈 Summary:")
    print(f"   • Total duplicate groups: {len(duplicates)}")
    print(f"   • Extra records to remove: {total_duplicate_records}")
    print(f"   • Clean database size after removal: {len(orders) - total_duplicate_records}\n")
    
    # Save duplicate details to file
    with open('duplicate_orders.json', 'w', encoding='utf-8') as f:
        json.dump(duplicate_details, f, indent=2, ensure_ascii=False)
    print("💾 Duplicate details saved to duplicate_orders.json\n")

print("\n" + "="*80)
print("OPTIONS FOR HANDLING DUPLICATES:")
print("="*80)
print("\n1️⃣  REMOVE DUPLICATES (Keep most recent)")
print("   → Run: python remove_duplicates.py")
print("   → Keeps the most recently updated record for each RO")
print("   → Deletes older duplicate records")
print("")
print("2️⃣  CLEAR DATABASE & FRESH IMPORT")
print("   → Run: python clear_database.py")
print("   → Removes ALL orders from database")
print("   → Then run: python import_csv.py")
print("   → Or run: python upload_orders.py")
print("")
print("💡 Recommendation: If you have a clean CSV/JSON file, option 2 is safest.")
print("   If you've made manual edits in the app, use option 1 to preserve recent changes.")
print("="*80)
