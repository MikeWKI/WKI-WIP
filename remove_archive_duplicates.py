import requests
import json
import time

# API Configuration
API_URL = "https://wki-wip-api.onrender.com/api"

print("🗑️  REMOVING DUPLICATE ARCHIVED ORDERS...\n")

# First, we need to add an endpoint to get all archived orders
# Let's fetch them via the archives endpoint
try:
    print("Fetching all archived orders...")
    
    # Get archives grouped by month
    response = requests.get(f"{API_URL}/archives", timeout=30)
    if response.status_code != 200:
        print(f"❌ Failed to fetch archives. Status: {response.status_code}")
        exit(1)
    
    archives_by_month = response.json()
    
    # Flatten into single list
    all_archived = []
    for month, orders in archives_by_month.items():
        all_archived.extend(orders)
    
    print(f"📊 Total archived orders: {len(all_archived)}\n")
    
except Exception as e:
    print(f"❌ Error fetching archives: {str(e)}")
    exit(1)

# Load duplicate details
try:
    with open('duplicate_archives.json', 'r', encoding='utf-8') as f:
        duplicate_details = json.load(f)
except FileNotFoundError:
    print("❌ No duplicate_archives.json found. Run check_completed_orders.py first!")
    exit(1)

if not duplicate_details:
    print("✅ No duplicate archives to remove!")
    exit(0)

print(f"Found {len(duplicate_details)} duplicate groups in archives\n")

print("⚠️  WARNING: This will delete duplicate archived records!")
print("   Strategy: Keep the most recently created record, delete the rest.\n")
response = input("Type 'DELETE' to proceed or anything else to cancel: ")

if response.strip().upper() != 'DELETE':
    print("❌ Cancelled. No changes made.")
    exit(0)

print("\n" + "="*100)
print(f"{'RO':<10} {'Action':<10} {'Archive Month':<20} {'Customer':<30} {'Status':<15}")
print("="*100)

# Note: We need a DELETE endpoint for archived orders
# For now, let's create a list of IDs to delete and provide instructions

deleted_count = 0
kept_count = 0
error_count = 0
ids_to_delete = []

for group in duplicate_details:
    ro = group['ro']
    orders_list = group['orders']
    
    # Sort by createdAt (most recent first)
    sorted_orders = sorted(
        orders_list,
        key=lambda x: x.get('createdAt', x.get('dateCompleted', '')),
        reverse=True
    )
    
    for idx, order in enumerate(sorted_orders):
        order_id = order.get('_id', order.get('id'))
        customer = order.get('customer', 'N/A')[:28]
        archive_month = order.get('archiveMonth', 'N/A')[:18]
        
        if idx == 0:
            # Keep this one
            action = "KEEP"
            status = "✅"
            kept_count += 1
            print(f"{ro:<10} {action:<10} {archive_month:<20} {customer:<30} {status:<15}")
        else:
            # Mark for deletion
            action = "DELETE"
            ids_to_delete.append({
                'id': order_id,
                'ro': ro,
                'customer': customer,
                'month': archive_month
            })
            print(f"{ro:<10} {action:<10} {archive_month:<20} {customer:<30} {'⚠️ Queued':<15}")

print("="*100)

# Save deletion list
with open('archived_to_delete.json', 'w', encoding='utf-8') as f:
    json.dump(ids_to_delete, f, indent=2, ensure_ascii=False)

print(f"\n⚠️  IMPORTANT:")
print(f"   The API doesn't have a DELETE endpoint for archived orders yet.")
print(f"   {len(ids_to_delete)} duplicate archived orders identified.")
print(f"\n💾 Deletion list saved to archived_to_delete.json")
print(f"\n🛠️  You have two options:")
print(f"   1. Add DELETE /api/archived-orders/:id endpoint to server")
print(f"   2. Manually delete from MongoDB using the IDs in archived_to_delete.json")
print(f"\nWould you like me to add the DELETE endpoint to the server? (y/n)")
