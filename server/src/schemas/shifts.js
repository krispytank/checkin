export default {
  collection: 'shifts',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'startTime', 'endTime', 'applicableDays'],
      properties: {
        name: { bsonType: 'string', description: 'Shift name is required' },
        startTime: { bsonType: 'string', description: 'Start time is required' },
        endTime: { bsonType: 'string', description: 'End time is required' },
        applicableDays: { bsonType: 'array', items: { bsonType: 'int', minimum: 0, maximum: 6 }, description: 'Applicable days are required (0-6)' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { name: 1 }, options: { unique: true } },
  ],
};
