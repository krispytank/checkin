export default {
  collection: 'equipment',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type', 'status'],
      properties: {
        name: { bsonType: 'string', description: 'Equipment name is required' },
        type: { bsonType: 'string', description: 'Equipment type is required' },
        serialNumber: { bsonType: ['string', 'null'] },
        status: { enum: ['available', 'booked', 'in-use', 'maintenance'], description: 'Must be a valid status' },
        description: { bsonType: ['string', 'null'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { type: 1 } },
    { key: { status: 1 } },
    { key: { name: 'text', serialNumber: 'text' } },
  ],
};
