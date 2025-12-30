import requests
import json
import time

# API Configuration
API_URL = "https://wki-wip-api.onrender.com/api"

print("🗑️  REMOVING DUPLICATE ORDERS (keeping most recent)...\n")

# Load duplicate details
try:
    with open('duplicate_orders.json', 'r', encoding='utf-8') as f:
        duplicate_details = json.load(f)
except FileNotFoundError:
    print("❌ No duplicate_orders.json found. Run check_duplicates.py first!")
    exit(1)

if not duplicate_details:
    print("✅ No duplicates to remove!")
    exit(0)

print(f"Found {len(duplicate_details)} duplicate groups\n")

# Ask for confirmation
print("⚠️  WARNING: This will delete duplicate records from the database!")
print("   Strategy: Keep the most recently updated record, delete the rest.\n")
response = input("Type 'DELETE' to proceed or anything else to cancel: ")

if response.strip().upper() != 'DELETE':
    print("❌ Cancelled. No changes made.")
    exit(0)

print("\n" + "="*100)
print(f"{'RO':<12} {'Action':<10} {'Customer':<35} {'ID':<20} {'Status':<10}")
print("="*100)

deleted_count = 0
kept_count = 0
error_count = 0

for group in duplicate_details:
    ro = group['ro']
    orders_list = group['orders']
    
    # Sort by updatedAt (most recent first)
    # If no updatedAt, fall back to createdAt
    sorted_orders = sorted(
        orders_list,
        key=lambda x: x.get('updatedAt', x.get('createdAt', '')),
        reverse=True
    )
    
    # Keep the first (most recent), delete the rest
    for idx, order in enumerate(sorted_orders):
        order_id = order.get('_id', order.get('id'))
        customer = order.get('customer', 'N/A')[:33]
        
        if idx == 0:
            # Keep this one
            action = "KEEP"
            status = "✅"
            kept_count += 1
            print(f"{ro:<12} {action:<10} {customer:<35} {order_id:<20} {status:<10}")
        else:
            # Delete this duplicate
            action = "DELETE"
            try:
                delete_response = requests.delete(f"{API_URL}/orders/{order_id}", timeout=10)
                
                if delete_response.status_code in [200, 204]:
                    deleted_count += 1
                    status = "✅ Deleted"
                else:
                    error_count += 1
                    status = f"❌ {delete_response.status_code}"
                
            except Exception as e:
                error_count += 1
                status = f"❌ Error"
            
            print(f"{ro:<12} {action:<10} {customer:<35} {order_id:<20} {status:<10}")
            time.sleep(0.1)  # Small delay to avoid overwhelming server

print("="*100)
print(f"\n📊 CLEANUP COMPLETE!")
print(f"   ✅ Kept (most recent): {kept_count}")
print(f"   🗑️  Deleted: {deleted_count}")
print(f"   ❌ Errors: {error_count}")
print(f"\n💡 Tip: Run check_duplicates.py again to verify all duplicates are gone.")
