export default {
  collection: 'registries',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'courtStationId'],
      properties: {
        name: { bsonType: 'string', description: 'Registry name is required' },
        courtStationId: { bsonType: 'string', description: 'Court station ID is required' },
        description: { bsonType: 'string' },
        isActive: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { courtStationId: 1 } },
    { key: { name: 1, courtStationId: 1 }, options: { unique: true } },
  ],
};
