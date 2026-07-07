export default {
  collection: 'bookings',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['bookingId', 'caseId', 'equipmentIds', 'userId', 'startDate', 'endDate', 'status'],
      properties: {
        bookingId: { bsonType: 'string', description: 'Booking ID is required' },
        caseId: { bsonType: 'string', description: 'Case ID is required' },
        equipmentIds: { bsonType: 'array', description: 'At least one equipment item is required' },
        userId: { bsonType: 'string', description: 'User ID is required' },
        startDate: { bsonType: 'date', description: 'Start date is required' },
        endDate: { bsonType: 'date', description: 'End date is required' },
        purpose: { bsonType: 'string' },
        status: { enum: ['pending', 'approved', 'dispatched', 'in-use', 'returned', 'received', 'rejected'], description: 'Must be a valid status' },
        history: { bsonType: 'array' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { bookingId: 1 }, options: { unique: true } },
    { key: { userId: 1 } },
    { key: { caseId: 1 } },
    { key: { status: 1 } },
    { key: { startDate: 1, endDate: 1 } },
  ],
};
