export default {
  collection: 'users',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['employeeId', 'name', 'email', 'password', 'role', 'isActive'],
      properties: {
        employeeId: { bsonType: 'string', description: 'Employee ID is required' },
        name: { bsonType: 'string', description: 'Name is required' },
        email: { bsonType: 'string', description: 'Email is required' },
        password: { bsonType: 'string', description: 'Password is required' },
        role: { enum: ['admin', 'supervisor', 'user'], description: 'Must be a valid role' },
        department: { bsonType: ['string', 'null'] },
        jobTitle: { bsonType: ['string', 'null'] },
        stationId: { bsonType: ['string', 'null'] },
        supervisorId: { bsonType: ['string', 'null'] },
        isActive: { bsonType: 'bool' },
        tokenVersion: { bsonType: 'int' },
        moduleAccess: { bsonType: 'object' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { employeeId: 1 }, options: { unique: true, sparse: true } },
    { key: { email: 1 }, options: { unique: true } },
    { key: { role: 1 } },
    { key: { stationId: 1 } },
    { key: { supervisorId: 1 } },
  ],
};
