export default {
  collection: 'password_resets',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'token', 'expires'],
      properties: {
        userId: { bsonType: 'string', description: 'User ID is required' },
        token: { bsonType: 'string', description: 'Token is required' },
        expires: { bsonType: 'date', description: 'Expiration date is required' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { token: 1 } },
    { key: { expires: 1 }, options: { expireAfterSeconds: 0 } },
  ],
};
