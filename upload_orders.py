import requests
import json
import time

# Change this to your API URL
API_URL = "https://wki-wip-api.onrender.com/api"  # Production
# API_URL = "http://localhost:3001/api"  # Local testing

print("🚀 Starting bulk upload to MongoDB via API...")
print(f"📡 Target: {API_URL}/orders\n")

with open('current_october_orders.json', 'r', encoding='utf-8') as f:
    orders = json.load(f)

success_count = 0
error_count = 0

for idx, order in enumerate(orders, 1):
    try:
        response = requests.post(f"{API_URL}/orders", json=order, timeout=10)
        
        if response.status_code in [200, 201]:
            success_count += 1
            print(f"✅ {idx}/{len(orders)} - {order['customer'][:30]:30} | RO: {order['ro']:6} | {response.status_code}")
        else:
            error_count += 1
            print(f"❌ {idx}/{len(orders)} - {order['customer'][:30]:30} | Error: {response.status_code}")
            
        # Small delay to avoid overwhelming the server
        time.sleep(0.1)
        
    except Exception as e:
        error_count += 1
        print(f"❌ {idx}/{len(orders)} - {order['customer'][:30]:30} | Exception: {str(e)}")

print(f"\n{'='*70}")
print(f"📊 Upload Complete!")
print(f"✅ Success: {success_count}")
print(f"❌ Errors: {error_count}")
print(f"📈 Total: {len(orders)}")
print(f"{'='*70}")
