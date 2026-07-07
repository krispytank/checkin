export default {
  collection: 'vehicle_maintenance',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['vehicleId', 'type', 'status'],
      properties: {
        vehicleId: { bsonType: 'string' },
        type: { bsonType: 'string' },
        description: { bsonType: 'string' },
        scheduledDate: { bsonType: ['date', 'null'] },
        completedDate: { bsonType: ['date', 'null'] },
        cost: { bsonType: ['double', 'null'] },
        provider: { bsonType: ['string', 'null'] },
        status: { bsonType: 'string' },
        reminderDate: { bsonType: ['date', 'null'] },
        notes: { bsonType: ['string', 'null'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { vehicleId: 1 } },
    { key: { status: 1 } },
    { key: { scheduledDate: 1 } },
    { key: { reminderDate: 1 } },
  ],
};
