export default {
  collection: 'strong_room_records',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['caseFileId', 'releaseTime'],
      properties: {
        caseFileId: { bsonType: 'string' },
        approvingOfficerId: { bsonType: 'string' },
        releasedBy: { bsonType: 'string' },
        receivedBy: { bsonType: ['string', 'null'] },
        releaseTime: { bsonType: 'date' },
        returnTime: { bsonType: ['date', 'null'] },
        reason: { bsonType: 'string' },
        status: { bsonType: 'string' },
        digitalSignature: { bsonType: ['string', 'null'] },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { caseFileId: 1 } },
    { key: { status: 1 } },
    { key: { releaseTime: -1 } },
  ],
};
