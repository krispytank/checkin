export default {
  collection: 'file_requests',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['requesterId', 'caseFileId', 'reason', 'purpose'],
      properties: {
        requesterId: { bsonType: 'string', description: 'Requester ID is required' },
        caseFileId: { bsonType: 'string', description: 'Case file ID is required' },
        department: { bsonType: ['string', 'null'] },
        reason: { bsonType: 'string' },
        purpose: { bsonType: 'string' },
        urgency: { bsonType: 'string' },
        supervisorApproval: { bsonType: 'string' },
        approvedBy: { bsonType: ['string', 'null'] },
        approvedAt: { bsonType: ['date', 'null'] },
        status: { bsonType: 'string' },
        rejectionReason: { bsonType: ['string', 'null'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { requesterId: 1 } },
    { key: { caseFileId: 1 } },
    { key: { status: 1 } },
    { key: { createdAt: -1 } },
  ],
};
