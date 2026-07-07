export default {
  collection: 'notification_preferences',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId'],
      properties: {
        userId: { bsonType: 'string', description: 'User ID is required' },
        lateCheckIn: { bsonType: 'bool' },
        lateCheckOut: { bsonType: 'bool' },
        overtime: { bsonType: 'bool' },
        shiftReminder: { bsonType: 'bool' },
        shiftChange: { bsonType: 'bool' },
        shiftAssignment: { bsonType: 'bool' },
        fileApproved: { bsonType: 'bool' },
        fileReleased: { bsonType: 'bool' },
        fileDueToday: { bsonType: 'bool' },
        fileOverdue: { bsonType: 'bool' },
        approvalRequired: { bsonType: 'bool' },
        fileReturned: { bsonType: 'bool' },
        tripApproved: { bsonType: 'bool' },
        maintenanceDue: { bsonType: 'bool' },
        insuranceExpiring: { bsonType: 'bool' },
        inspectionExpiring: { bsonType: 'bool' },
        muteUntil: { bsonType: ['date', 'null'] },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { userId: 1 }, options: { unique: true } },
  ],
};
