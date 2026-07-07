export default {
  collection: 'parking_spaces',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['stationId', 'spaceNumber', 'status'],
      properties: {
        stationId: { bsonType: 'string', description: 'Station ID is required' },
        spaceNumber: { bsonType: 'string', description: 'Space number is required' },
        category: { bsonType: 'string' },
        status: { enum: ['available', 'occupied', 'reserved', 'maintenance'], description: 'Must be a valid status' },
        assignedVehicleId: { bsonType: ['string', 'null'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { stationId: 1 } },
    { key: { status: 1 } },
  ],
};
