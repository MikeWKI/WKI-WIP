import csv
from pymongo import MongoClient
from datetime import datetime

# MongoDB connection
MONGODB_URI = "mongodb+srv://WKI-WIP:D3cisiv2025!@wki-cluster-1.hvfw5be.mongodb.net/wki-wip?retryWrites=true&w=majority&appName=WKI-Cluster-1"

def import_csv_to_mongo_archive(csv_file, archive_month):
    """Import CSV data directly to MongoDB archives collection"""
    
    print(f"\nImporting {csv_file} to MongoDB archives: {archive_month}")
    
    # Connect to MongoDB
    client = MongoClient(MONGODB_URI)
    db = client['wki-wip']
    archives_collection = db['archives']
    
    # Define column headers manually (CSV has no header row)
    headers = ['Customer', 'UNIT', 'R.O.', 'Bay #', 'First Shift Notes', 'Second Shift Notes', 
               'Ordered parts/ETA and TCS case #s', 'Triage Notes ', 'Quote Status', 
               'Repair Condition', 'Contact Info', 'Account Status', 'Customer Status', 'Call']
    
    orders_to_insert = []
    skipped_count = 0
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        csv_reader = csv.reader(file)
        
        for row_data in csv_reader:
            # Skip empty rows or rows with no customer
            if len(row_data) == 0 or not row_data[0] or row_data[0].strip() == '':
                skipped_count += 1
                continue
            
            # Create dict from row data
            row = {}
            for i, header in enumerate(headers):
                if i < len(row_data):
                    row[header] = row_data[i]
                else:
                    row[header] = ''
            
            # Prepare order document for MongoDB
            order_doc = {
                "customer": row.get('Customer', '').strip(),
                "unit": row.get('UNIT', '').strip(),
                "roNumber": row.get('R.O.', '').strip(),
                "bayNumber": row.get('Bay #', '').strip(),
                "firstShiftNotes": row.get('First Shift Notes', '').strip(),
                "secondShiftNotes": row.get('Second Shift Notes', '').strip(),
                "orderedParts": row.get('Ordered parts/ETA and TCS case #s', '').strip(),
                "triageNotes": row.get('Triage Notes ', '').strip(),
                "quoteStatus": row.get('Quote Status', '').strip(),
                "repairCondition": row.get('Repair Condition', '').strip(),
                "contactInfo": row.get('Contact Info', '').strip(),
                "accountStatus": row.get('Account Status', '').strip(),
                "customerStatus": row.get('Customer Status', '').strip(),
                "call": row.get('Call', '').strip(),
                "archiveMonth": archive_month,
                "completedAt": datetime.now(),
                "createdAt": datetime.now(),
                "updatedAt": datetime.now()
            }
            
            orders_to_insert.append(order_doc)
    
    print(f"Found {len(orders_to_insert)} orders to archive")
    print(f"Skipped {skipped_count} empty rows")
    
    if orders_to_insert:
        try:
            # Insert all documents
            result = archives_collection.insert_many(orders_to_insert)
            print(f"\n[SUCCESS] Inserted {len(result.inserted_ids)} orders into MongoDB archives!")
            print(f"Archive month: {archive_month}")
            
        except Exception as e:
            print(f"\n[ERROR] Failed to insert into MongoDB: {str(e)}")
    else:
        print("\n[WARNING] No orders to insert")
    
    client.close()

if __name__ == "__main__":
    # Import November 2025
    print("=" * 60)
    print("IMPORTING NOVEMBER 2025 ARCHIVES")
    print("=" * 60)
    import_csv_to_mongo_archive(
        "public\\Service Dept Sheets - November 2025.csv",
        "November 2025"
    )
    
    # Import December 2025
    print("\n" + "=" * 60)
    print("IMPORTING DECEMBER 2025 ARCHIVES")
    print("=" * 60)
    import_csv_to_mongo_archive(
        "public\\Service Dept Sheets - December 2025.csv",
        "December 2025"
    )
    
    print("\n" + "=" * 60)
    print("IMPORT COMPLETE!")
    print("=" * 60)
    print("Refresh the app to see November and December 2025 archives populated.")
