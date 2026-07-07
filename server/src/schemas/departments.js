export default {
  collection: 'departments',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name'],
      properties: {
        name: { bsonType: 'string', description: 'Department name is required' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [],
};
