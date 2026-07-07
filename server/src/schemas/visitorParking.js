export default {
  collection: 'visitor_parking',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['vehicleRegNumber', 'ownerName', 'category', 'courtStationId', 'timeIn'],
      properties: {
        vehicleRegNumber: { bsonType: 'string' },
        ownerName: { bsonType: 'string' },
        category: { bsonType: 'string' },
        purposeOfVisit: { bsonType: 'string' },
        courtStationId: { bsonType: 'string' },
        courtBeingVisited: { bsonType: ['string', 'null'] },
        parkingSpaceId: { bsonType: ['string', 'null'] },
        parkingLotId: { bsonType: ['string', 'null'] },
        timeIn: { bsonType: 'date' },
        timeOut: { bsonType: ['date', 'null'] },
        status: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { courtStationId: 1 } },
    { key: { vehicleRegNumber: 1 } },
    { key: { status: 1 } },
    { key: { timeIn: -1 } },
  ],
};
