from pymongo import MongoClient

# MongoDB connection
MONGODB_URI = "mongodb+srv://WKI-WIP:D3cisiv2025!@wki-cluster-1.hvfw5be.mongodb.net/wki-wip?retryWrites=true&w=majority&appName=WKI-Cluster-1"

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client['wki-wip']

# Check November archives
print("November 2025 Archives - First 5:")
archives = db['archivedorders'].find({"archiveMonth": "November 2025"}).limit(5)
for i, doc in enumerate(archives, 1):
    print(f"\n{i}. _id: {doc.get('_id')}")
    print(f"   customer: {doc.get('customer')}")
    print(f"   roNumber: {doc.get('roNumber')}")
    print(f"   unit: {doc.get('unit')}")

print("\n" + "="*60)
print("December 2025 Archives - First 5:")
archives = db['archivedorders'].find({"archiveMonth": "December 2025"}).limit(5)
for i, doc in enumerate(archives, 1):
    print(f"\n{i}. _id: {doc.get('_id')}")
    print(f"   customer: {doc.get('customer')}")
    print(f"   roNumber: {doc.get('roNumber')}")
    print(f"   unit: {doc.get('unit')}")

client.close()
