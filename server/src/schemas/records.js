export default {
  collection: 'records',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'date', 'status'],
      properties: {
        userId: { bsonType: 'string', description: 'User ID is required' },
        date: { bsonType: 'string', description: 'Date is required' },
        events: { bsonType: 'array' },
        status: { enum: ['present', 'absent', 'late', 'half-day', 'overtime'], description: 'Must be a valid status' },
        totalHours: { bsonType: ['double', 'int'], minimum: 0 },
        checkInTime: { bsonType: ['date', 'null'] },
        checkOutTime: { bsonType: ['date', 'null'] },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { userId: 1, date: 1 }, options: { unique: true } },
    { key: { date: 1 } },
    { key: { status: 1 } },
  ],
};
