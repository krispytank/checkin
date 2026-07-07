export default {
  collection: 'cases',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['caseNumber', 'title'],
      properties: {
        caseNumber: { bsonType: 'string', description: 'Case number is required' },
        title: { bsonType: 'string', description: 'Case title is required' },
        description: { bsonType: ['string', 'null'] },
        status: { bsonType: 'string' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { caseNumber: 1 }, options: { unique: true } },
    { key: { title: 'text', caseNumber: 'text' } },
  ],
};
