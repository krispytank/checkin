export default {
  collection: 'parking_lots',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'courtStationId', 'category', 'totalBays'],
      properties: {
        name: { bsonType: 'string', description: 'Parking lot name is required' },
        courtStationId: { bsonType: 'string', description: 'Court station ID is required' },
        category: { bsonType: 'string', description: 'Category is required' },
        totalBays: { bsonType: 'int', minimum: 1 },
        occupiedBays: { bsonType: 'int' },
        reservedBays: { bsonType: 'int' },
        description: { bsonType: ['string', 'null'] },
        gpsLatitude: { bsonType: ['double', 'null'] },
        gpsLongitude: { bsonType: ['double', 'null'] },
        status: { bsonType: 'string' },
        isActive: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { courtStationId: 1 } },
    { key: { category: 1 } },
    { key: { status: 1 } },
  ],
};
