export default {
  collection: 'equipment_types',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name'],
      properties: {
        name: { bsonType: 'string', description: 'Type name is required' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { name: 1 }, options: { unique: true } },
  ],
};
