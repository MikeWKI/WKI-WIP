import requests
import json
import time

# API Configuration
API_URL = "https://wki-wip-api.onrender.com/api"

print("🔄 Retrying failed orders...\n")

# The 3 orders that failed due to timeout
failed_orders = [
    {
        'customer': 'Metro 12.19',
        'unit': '333',
        'ro': '40832',
        'bay': 'DIRT',
        'firstShift': 'Phil is going on this to replace air compressor and thermostats. 12-30 TM 7:00......WOA TO REPLACE AIR COMPRESSOR. RECONNECTED AIR COMPRESSOR COOLANT LINES, ADDED COOLANT, AND MOVED TO DIRT LOT. 838 12-24 SD FOREMAN QUOTE SUBMITTED TO REPLACE AIR COMPRESSOR. 800 12-22 SD NOAH TESTING AIR COMPRESSOR. 700 12-22 SD MARIO ON THIS FOR KCI AND TRIAGE. 848 12-20 SD',
        'secondShift': '',
        'orderedParts': '',
        'triageNotes': '',
        'quoteStatus': 'Est sent NW 12.22',
        'repairCondition': 'Pushing coolant',
        'contactInfo': 'Miguel',
        'accountStatus': 'Open',
        'customerStatus': '',
        'call': '',
        'dateAdded': '2025-12-30'
    },
    {
        'customer': 'Freight Logistics 12.16',
        'unit': '7098',
        'ro': '40794',
        'bay': 'Row 1',
        'firstShift': 'Pan was put back on as well as valve cover and air filter box, no oil in unit and pushed out to the dirt lot per sapp. 12-23 TM 9:25......Waiting on approval from customer or sapp????? 12-23 TM 6:30...... Camshaft is flaking off on #6 cam lobe. Tech 106 is on this for OP 2 top end noise. 12-18 DR 0915',
        'secondShift': ' steve found clutch wear codes quoted out clutch ,pivot pin , pilot bearing  and rear main seal , I updated the estimate will need upper engine noise look at still .12/17/2400 DC',
        'orderedParts': '',
        'triageNotes': '',
        'quoteStatus': '',
        'repairCondition': 'Transmission light',
        'contactInfo': 'Dave 316-831-9700 ext 120',
        'accountStatus': 'PO# Needed',
        'customerStatus': '',
        'call': '',
        'dateAdded': '2025-12-30'
    },
    {
        'customer': 'Miramar Transport 12.20',
        'unit': '95',
        'ro': '40841',
        'bay': '22',
        'firstShift': 'FOREMAN QUOTE SUBMITTED TO REPLACE ESPAR CONTROLLER. ESPAR FUEL LINE AND ESPAR EXHAUST REPAIRS COMPLETED. 1500 12-23 SD LARYSSA CHECKING ESPAR. 1149 12-23 SD Overhead is completed, will look into APU issue tomarrow. 12-22 1200 JB. BAILEY ON THIS FOR KCI. 718 12-22 SD ........DELETED........',
        'secondShift': '',
        'orderedParts': '',
        'triageNotes': '',
        'quoteStatus': 'est sent NW 12.23',
        'repairCondition': 'Overhead, sleeper t-stat, APU fuel line, sleeper heater inoperable.',
        'contactInfo': '',
        'accountStatus': 'COD',
        'customerStatus': '',
        'call': '',
        'dateAdded': '2025-12-30'
    }
]

success_count = 0
error_count = 0

for idx, order in enumerate(failed_orders, 1):
    try:
        response = requests.post(f"{API_URL}/orders", json=order, timeout=30)
        
        if response.status_code in [200, 201]:
            success_count += 1
            print(f"✅ {idx}/3 - {order['customer']} (RO: {order['ro']}) - SUCCESS")
        else:
            error_count += 1
            print(f"❌ {idx}/3 - {order['customer']} (RO: {order['ro']}) - ERROR {response.status_code}")
            print(f"   {response.text}")
        
        time.sleep(0.5)
        
    except Exception as e:
        error_count += 1
        print(f"❌ {idx}/3 - {order['customer']} (RO: {order['ro']}) - EXCEPTION")
        print(f"   {str(e)}")

print(f"\n{'='*50}")
print(f"✅ Successful: {success_count}")
print(f"❌ Failed: {error_count}")
print(f"{'='*50}")
