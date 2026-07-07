export default {
  collection: 'audit_logs',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'action', 'module', 'entityType', 'timestamp'],
      properties: {
        userId: { bsonType: 'string', description: 'User ID is required' },
        action: { bsonType: 'string', description: 'Action is required' },
        module: { bsonType: 'string', description: 'Module is required' },
        entityType: { bsonType: 'string', description: 'Entity type is required' },
        entityId: { bsonType: ['string', 'null'] },
        previousValue: { bsonType: ['object', 'null'] },
        newValue: { bsonType: ['object', 'null'] },
        stationId: { bsonType: ['string', 'null'] },
        ipAddress: { bsonType: ['string', 'null'] },
        description: { bsonType: ['string', 'null'] },
        timestamp: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { timestamp: -1 } },
    { key: { userId: 1 } },
    { key: { module: 1 } },
    { key: { entityType: 1 } },
    { key: { entityId: 1 } },
    { key: { stationId: 1 } },
    { key: { module: 1, action: 1 } },
  ],
};
