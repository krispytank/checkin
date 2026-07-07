export default {
  collection: 'shift_assignments',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'shiftId'],
      properties: {
        userId: { bsonType: 'string', description: 'User ID is required' },
        shiftId: { bsonType: 'string', description: 'Shift ID is required' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { userId: 1 }, options: { unique: true } },
    { key: { shiftId: 1 } },
  ],
};
