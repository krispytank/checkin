export default {
  collection: 'job_titles',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name'],
      properties: {
        name: { bsonType: 'string', description: 'Job title name is required' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [],
};
