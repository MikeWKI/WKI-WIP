from pymongo import MongoClient
from collections import Counter

# MongoDB connection
MONGODB_URI = "mongodb+srv://WKI-WIP:D3cisiv2025!@wki-cluster-1.hvfw5be.mongodb.net/wki-wip?retryWrites=true&w=majority&appName=WKI-Cluster-1"

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client['wki-wip']

# Check for duplicate RO numbers in each month
for month in ["November 2025", "December 2025"]:
    print(f"\n{month}:")
    archives = list(db['archivedorders'].find({"archiveMonth": month}))
    ro_numbers = [doc.get('roNumber') for doc in archives]
    
    # Count occurrences
    ro_counts = Counter(ro_numbers)
    duplicates = {ro: count for ro, count in ro_counts.items() if count > 1}
    
    print(f"  Total documents: {len(archives)}")
    print(f"  Unique RO numbers: {len(ro_counts)}")
    
    if duplicates:
        print(f"  Duplicates found:")
        for ro, count in duplicates.items():
            print(f"    - RO #{ro}: {count} times")
            # Show which customers
            matching_docs = [doc for doc in archives if doc.get('roNumber') == ro]
            for doc in matching_docs:
                print(f"      * {doc.get('customer')} (ID: {doc.get('_id')})")
    else:
        print(f"  No duplicates!")

client.close()
