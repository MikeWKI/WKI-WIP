import csv
import json

def csv_to_typescript_archives(csv_file, month_name, start_id=1):
    """Convert archive CSV to TypeScript format"""
    
    headers = ['Customer', 'UNIT', 'R.O.', 'Bay #', 'First Shift Notes', 'Second Shift Notes', 
               'Ordered parts/ETA and TCS case #s', 'Triage Notes ', 'Quote Status', 
               'Repair Condition', 'Contact Info', 'Account Status', 'Customer Status', 'Call']
    
    orders = []
    current_id = start_id
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        csv_reader = csv.reader(file)
        
        for row_data in csv_reader:
            if len(row_data) == 0 or not row_data[0] or row_data[0].strip() == '':
                continue
            
            row = {}
            for i, header in enumerate(headers):
                if i < len(row_data):
                    row[header] = row_data[i]
                else:
                    row[header] = ''
            
            order = {
                "id": current_id,
                "customer": row.get('Customer', '').strip(),
                "unit": row.get('UNIT', '').strip(),
                "ro": row.get('R.O.', '').strip(),
                "bay": row.get('Bay #', '').strip(),
                "firstShift": row.get('First Shift Notes', '').strip(),
                "secondShift": row.get('Second Shift Notes', '').strip(),
                "orderedParts": row.get('Ordered parts/ETA and TCS case #s', '').strip(),
                "triageNotes": row.get('Triage Notes ', '').strip(),
                "quoteStatus": row.get('Quote Status', '').strip(),
                "repairCondition": row.get('Repair Condition', '').strip(),
                "contactInfo": row.get('Contact Info', '').strip(),
                "accountStatus": row.get('Account Status', '').strip(),
                "customerStatus": row.get('Customer Status', '').strip(),
                "call": row.get('Call', '').strip()
            }
            
            orders.append(order)
            current_id += 1
    
    # Generate TypeScript code
    output = f'  "{month_name}": [\n'
    
    for order in orders:
        output += '    {\n'
        output += f'      id: {order["id"]},\n'
        
        for key in ['customer', 'unit', 'ro', 'bay', 'firstShift', 'secondShift', 
                    'orderedParts', 'triageNotes', 'quoteStatus', 'repairCondition', 
                    'contactInfo', 'accountStatus', 'customerStatus', 'call']:
            value = order[key].replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            output += f'      {key}: "{value}",\n'
        
        output = output.rstrip(',\n') + '\n'
        output += '    },\n'
    
    output = output.rstrip(',\n') + '\n'
    output += '  ],\n'
    
    return output, len(orders)

# Process all three archive months
files = [
    ("public\\Service Dept Sheets - November 2025.csv", "November 2025", 1000),
    ("public\\Service Dept Sheets - December 2025.csv", "December 2025", 2000),
]

print("// Add this to src/archivedData.ts archivedOrders object:")
print()

for csv_file, month_name, start_id in files:
    try:
        typescript_code, count = csv_to_typescript_archives(csv_file, month_name, start_id)
        print(typescript_code)
        print(f"// {month_name}: {count} orders")
        print()
    except Exception as e:
        print(f"// Error processing {month_name}: {str(e)}")
        print()
