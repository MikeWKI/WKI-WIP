import requests
import json
from collections import defaultdict

# API Configuration
API_URL = "https://wki-wip-api.onrender.com/api"

print("🔍 Checking for completed orders and archive duplicates...\n")

# Fetch all active orders
try:
    response = requests.get(f"{API_URL}/orders", timeout=30)
    if response.status_code != 200:
        print(f"❌ Failed to fetch orders. Status: {response.status_code}")
        exit(1)
    orders = response.json()
    print(f"📊 Active orders in database: {len(orders)}")
except Exception as e:
    print(f"❌ Error fetching orders: {str(e)}")
    exit(1)

# Fetch all archived orders
try:
    response = requests.get(f"{API_URL}/archives", timeout=30)
    if response.status_code != 200:
        print(f"⚠️  No archives found or error fetching. Status: {response.status_code}")
        archived_orders = []
        archives_by_month = {}
    else:
        archives_by_month = response.json()
        # Flatten into single list
        archived_orders = []
        for month, orders in archives_by_month.items():
            archived_orders.extend(orders)
    print(f"📦 Archived orders in database: {len(archived_orders)}\n")
except Exception as e:
    print(f"⚠️  Could not fetch archived orders: {str(e)}")
    archived_orders = []

# Check for completed orders (customerStatus = "Completed" or repairCondition = "Complete")
completed_orders = []
for order in orders:
    customer_status = order.get('customerStatus', '').strip().lower()
    repair_condition = order.get('repairCondition', '').strip().lower()
    
    if 'complete' in customer_status or 'complete' in repair_condition:
        completed_orders.append(order)

if completed_orders:
    print(f"✅ Found {len(completed_orders)} completed orders that should be archived:\n")
    print("=" * 100)
    print(f"{'RO':<10} {'Customer':<35} {'Status/Condition':<30} {'Date Added':<12}")
    print("=" * 100)
    
    for order in completed_orders:
        ro = order.get('ro', 'N/A')[:8]
        customer = order.get('customer', 'N/A')[:33]
        status = f"{order.get('customerStatus', '')} / {order.get('repairCondition', '')}"[:28]
        date_added = order.get('dateAdded', 'N/A')[:10]
        print(f"{ro:<10} {customer:<35} {status:<30} {date_added:<12}")
    
    print("=" * 100)
    
    # Save to file for archiving
    with open('orders_to_archive.json', 'w', encoding='utf-8') as f:
        json.dump(completed_orders, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Completed orders saved to orders_to_archive.json\n")
else:
    print("✅ No completed orders found in active database.\n")

# Check for duplicate archives
if archived_orders:
    print("\n📦 Checking archived orders for duplicates...\n")
    
    # Group by archiveMonth
    archive_groups = defaultdict(list)
    for order in archived_orders:
        archive_month = order.get('archiveMonth', 'Unknown')
        archive_groups[archive_month].append(order)
    
    print(f"Archive months found: {len(archive_groups)}")
    print("=" * 80)
    print(f"{'Archive Month':<20} {'Count':<10}")
    print("=" * 80)
    for month, orders_list in sorted(archive_groups.items()):
        print(f"{month:<20} {len(orders_list):<10}")
    print("=" * 80)
    
    # Check for duplicate RO numbers within archives
    ro_groups = defaultdict(list)
    for order in archived_orders:
        ro_number = order.get('ro', '').strip()
        if ro_number:
            ro_groups[ro_number].append(order)
    
    duplicates = {ro: orders_list for ro, orders_list in ro_groups.items() if len(orders_list) > 1}
    
    if duplicates:
        print(f"\n⚠️  Found {len(duplicates)} duplicate RO numbers in archives:\n")
        print("=" * 120)
        print(f"{'RO':<10} {'Count':<8} {'Archive Months':<40} {'Customers':<40}")
        print("=" * 120)
        
        for ro, orders_list in sorted(duplicates.items()):
            count = len(orders_list)
            months = ' | '.join(set([o.get('archiveMonth', 'N/A')[:15] for o in orders_list]))[:38]
            customers = ' | '.join([o.get('customer', 'N/A')[:15] for o in orders_list[:2]])[:38]
            if count > 2:
                customers += '...'
            
            print(f"{ro:<10} {count:<8} {months:<40} {customers:<40}")
        
        print("=" * 120)
        
        # Save duplicate archive details
        with open('duplicate_archives.json', 'w', encoding='utf-8') as f:
            duplicate_details = [{'ro': ro, 'count': len(orders_list), 'orders': orders_list} 
                               for ro, orders_list in duplicates.items()]
            json.dump(duplicate_details, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Duplicate archive details saved to duplicate_archives.json\n")
    else:
        print("\n✅ No duplicate RO numbers found in archives.\n")

print("\n" + "="*80)
print("NEXT STEPS:")
print("="*80)
has_duplicates = False
if archived_orders:
    # Check for duplicate RO numbers within archives
    ro_groups = defaultdict(list)
    for order in archived_orders:
        ro_number = order.get('ro', '').strip()
        if ro_number:
            ro_groups[ro_number].append(order)
    
    duplicates = {ro: orders_list for ro, orders_list in ro_groups.items() if len(orders_list) > 1}
    has_duplicates = bool(duplicates)

if completed_orders:
    print(f"\n📦 Archive {len(completed_orders)} completed orders:")
    print("   → Run: python archive_completed.py")
if has_duplicates:
    print(f"\n🗑️  Remove {len(duplicates)} duplicate archives:")
    print("   → Run: python remove_archive_duplicates.py")
if not completed_orders and not has_duplicates:
    print("\n✅ Everything looks good! No action needed.")
print("="*80)
