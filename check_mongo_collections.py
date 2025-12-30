from pymongo import MongoClient

# MongoDB connection
MONGODB_URI = "mongodb+srv://WKI-WIP:D3cisiv2025!@wki-cluster-1.hvfw5be.mongodb.net/wki-wip?retryWrites=true&w=majority&appName=WKI-Cluster-1"

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client['wki-wip']

# List all collections
print("Collections in wki-wip database:")
collections = db.list_collection_names()
for col in collections:
    count = db[col].count_documents({})
    print(f"  - {col}: {count} documents")

# Check archives collection
if 'archives' in collections:
    print("\nArchives collection samples:")
    archives = db['archives'].find().limit(3)
    for doc in archives:
        print(f"  - {doc.get('customer')} (Month: {doc.get('archiveMonth')})")

# Check archivedorders collection
if 'archivedorders' in collections:
    print("\nArchivedOrders collection samples:")
    archived = db['archivedorders'].find().limit(3)
    for doc in archived:
        print(f"  - {doc.get('customer')} (Month: {doc.get('archiveMonth')})")

client.close()
