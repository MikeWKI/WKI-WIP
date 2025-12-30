import requests
import json
import time

# API Configuration
API_URL = "https://wki-wip-api.onrender.com/api"

print("📦 ARCHIVING COMPLETED ORDERS...\n")

# Load completed orders
try:
    with open('orders_to_archive.json', 'r', encoding='utf-8') as f:
        orders_to_archive = json.load(f)
except FileNotFoundError:
    print("❌ No orders_to_archive.json found. Run check_completed_orders.py first!")
    exit(1)

if not orders_to_archive:
    print("✅ No orders to archive!")
    exit(0)

print(f"Found {len(orders_to_archive)} orders to archive\n")

# Ask for archive month
print("📅 Which month should these orders be archived to?")
print("   Examples: 'October 2025', 'December 2025'")
archive_month = input("Archive month: ").strip()

if not archive_month:
    print("❌ Archive month is required. Cancelled.")
    exit(0)

print(f"\n⚠️  This will archive {len(orders_to_archive)} orders to '{archive_month}'")
response = input("Type 'ARCHIVE' to proceed or anything else to cancel: ")

if response.strip().upper() != 'ARCHIVE':
    print("❌ Cancelled. No changes made.")
    exit(0)

print("\n" + "="*100)
print(f"{'RO':<10} {'Customer':<35} {'Status':<15} {'Result':<20}")
print("="*100)

archived_count = 0
error_count = 0

for order in orders_to_archive:
    order_id = order.get('_id', order.get('id'))
    ro = order.get('ro', 'N/A')[:8]
    customer = order.get('customer', 'N/A')[:33]
    
    try:
        # Archive via API (POST /api/orders/:id/archive)
        archive_response = requests.post(
            f"{API_URL}/orders/{order_id}/archive",
            json={'archiveMonth': archive_month},
            timeout=10
        )
        
        if archive_response.status_code in [200, 201]:
            archived_count += 1
            status = "✅ Archived"
        else:
            error_count += 1
            status = f"❌ {archive_response.status_code}"
        
    except Exception as e:
        error_count += 1
        status = f"❌ Error"
    
    customer_status = order.get('customerStatus', 'N/A')[:13]
    print(f"{ro:<10} {customer:<35} {customer_status:<15} {status:<20}")
    
    time.sleep(0.1)  # Small delay

print("="*100)
print(f"\n✅ ARCHIVING COMPLETE!")
print(f"   📦 Archived to '{archive_month}': {archived_count}")
print(f"   ❌ Errors: {error_count}")
