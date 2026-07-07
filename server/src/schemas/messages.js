export default {
  collection: 'messages',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['senderId', 'receiverId', 'type', 'subject', 'content', 'read'],
      properties: {
        senderId: { bsonType: 'string', description: 'Sender ID is required' },
        receiverId: { bsonType: 'string', description: 'Receiver ID is required' },
        type: { enum: ['alert', 'message', 'notification'], description: 'Must be a valid message type' },
        subject: { bsonType: 'string', description: 'Subject is required' },
        content: { bsonType: 'string', description: 'Content is required' },
        link: { bsonType: ['string', 'null'] },
        read: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { receiverId: 1, read: 1 } },
    { key: { senderId: 1 } },
    { key: { createdAt: -1 } },
  ],
};
