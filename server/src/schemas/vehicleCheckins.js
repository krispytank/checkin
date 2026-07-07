export default {
  collection: 'vehicle_checkins',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['vehicleId', 'plateNumber', 'type', 'timestamp'],
      properties: {
        vehicleId: { bsonType: 'string', description: 'Vehicle ID is required' },
        plateNumber: { bsonType: 'string', description: 'Plate number is required' },
        stationId: { bsonType: ['string', 'null'] },
        parkingSpaceId: { bsonType: ['string', 'null'] },
        type: { enum: ['check-in', 'check-out'], description: 'Must be check-in or check-out' },
        scannedBy: { bsonType: ['string', 'null'] },
        notes: { bsonType: ['string', 'null'] },
        timestamp: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { vehicleId: 1 } },
    { key: { stationId: 1 } },
    { key: { timestamp: -1 } },
    { key: { type: 1 } },
    { key: { vehicleId: 1, stationId: 1, type: 1 } },
  ],
};
