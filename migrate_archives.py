from pymongo import MongoClient

# MongoDB connection
MONGODB_URI = "mongodb+srv://WKI-WIP:D3cisiv2025!@wki-cluster-1.hvfw5be.mongodb.net/wki-wip?retryWrites=true&w=majority&appName=WKI-Cluster-1"

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client['wki-wip']

# Get all documents from 'archives' collection
archives_col = db['archives']
archivedorders_col = db['archivedorders']

print("Moving data from 'archives' to 'archivedorders' collection...")

# Get all documents from archives
all_archives = list(archives_col.find())
print(f"Found {len(all_archives)} documents in 'archives' collection")

if all_archives:
    # Insert into archivedorders
    result = archivedorders_col.insert_many(all_archives)
    print(f"Inserted {len(result.inserted_ids)} documents into 'archivedorders' collection")
    
    # Delete from archives
    delete_result = archives_col.delete_many({})
    print(f"Deleted {delete_result.deleted_count} documents from 'archives' collection")
    
    print("\n✓ Migration complete!")
else:
    print("No documents to migrate")

# Verify
print(f"\nFinal counts:")
print(f"  - archives: {archives_col.count_documents({})} documents")
print(f"  - archivedorders: {archivedorders_col.count_documents({})} documents")

# Show breakdown by month
print(f"\nArchives by month:")
pipeline = [
    {"$group": {"_id": "$archiveMonth", "count": {"$sum": 1}}},
    {"$sort": {"_id": 1}}
]
for result in archivedorders_col.aggregate(pipeline):
    print(f"  - {result['_id']}: {result['count']} orders")

client.close()
