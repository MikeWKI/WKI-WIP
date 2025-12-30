import requests
import time

# API Configuration
API_URL = "https://wki-wip-api.onrender.com/api"

print("🗑️  DATABASE CLEAR UTILITY\n")
print("=" * 80)
print("⚠️  WARNING: This will DELETE ALL ORDERS from the database!")
print("=" * 80)
print("\nThis is useful when you want to:")
print("  • Start fresh with a clean CSV import")
print("  • Remove all duplicate data and reimport")
print("  • Reset the database to a known clean state")
print("\nAfter clearing, you can reimport using:")
print("  • python import_csv.py (from CSV file)")
print("  • python upload_orders.py (from JSON file)")
print("\n" + "=" * 80)

# Fetch current count
try:
    response = requests.get(f"{API_URL}/orders", timeout=30)
    if response.status_code == 200:
        orders = response.json()
        total_orders = len(orders)
        print(f"\n📊 Current database contains: {total_orders} orders\n")
    else:
        print(f"\n⚠️  Could not fetch order count (status {response.status_code})\n")
        total_orders = "unknown number of"
except Exception as e:
    print(f"\n⚠️  Could not fetch order count: {str(e)}\n")
    total_orders = "unknown number of"

# Confirmation
print(f"⚠️  You are about to delete {total_orders} orders!")
print("\nType 'CLEAR DATABASE' to proceed or anything else to cancel: ")
confirmation = input("> ")

if confirmation.strip() != 'CLEAR DATABASE':
    print("\n❌ Cancelled. No changes made.")
    exit(0)

print("\n🗑️  Starting deletion process...\n")

# Fetch all orders
try:
    response = requests.get(f"{API_URL}/orders", timeout=30)
    if response.status_code != 200:
        print(f"❌ Failed to fetch orders. Status: {response.status_code}")
        exit(1)
    
    orders = response.json()
    total = len(orders)
    
except Exception as e:
    print(f"❌ Error fetching orders: {str(e)}")
    exit(1)

# Delete each order
deleted_count = 0
error_count = 0

print("=" * 80)
print(f"{'Progress':<15} {'Customer':<35} {'RO':<10} {'Status':<10}")
print("=" * 80)

for idx, order in enumerate(orders, 1):
    order_id = order.get('_id', order.get('id'))
    customer = order.get('customer', 'N/A')[:33]
    ro = order.get('ro', 'N/A')[:8]
    
    try:
        delete_response = requests.delete(f"{API_URL}/orders/{order_id}", timeout=10)
        
        if delete_response.status_code in [200, 204]:
            deleted_count += 1
            status = "✅"
        else:
            error_count += 1
            status = f"❌ {delete_response.status_code}"
        
    except Exception as e:
        error_count += 1
        status = "❌ Error"
    
    progress = f"{idx}/{total}"
    print(f"{progress:<15} {customer:<35} {ro:<10} {status:<10}")
    
    # Progress indicator every 10 records
    if idx % 10 == 0 or idx == total:
        percent = (idx / total) * 100
        print(f"   📊 Progress: {percent:.1f}% ({idx}/{total})")
    
    time.sleep(0.05)  # Small delay to avoid overwhelming server

print("=" * 80)
print(f"\n✅ DATABASE CLEARED!")
print(f"   🗑️  Deleted: {deleted_count}")
print(f"   ❌ Errors: {error_count}")
print(f"\n📝 Next steps:")
print(f"   1. Prepare your clean data file (CSV or JSON)")
print(f"   2. Run: python import_csv.py (for CSV)")
print(f"      Or: python upload_orders.py (for JSON)")
print("=" * 80)
