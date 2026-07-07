export default {
  collection: 'stations',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'latitude', 'longitude', 'radiusMeters'],
      properties: {
        name: { bsonType: 'string', description: 'Station name is required' },
        latitude: { bsonType: 'double', minimum: -90, maximum: 90, description: 'Latitude must be between -90 and 90' },
        longitude: { bsonType: 'double', minimum: -180, maximum: 180, description: 'Longitude must be between -180 and 180' },
        radiusMeters: { bsonType: 'int', minimum: 10, maximum: 1000, description: 'Radius must be between 10 and 1000' },
        address: { bsonType: ['string', 'null'] },
        city: { bsonType: ['string', 'null'] },
        phoneNumber: { bsonType: ['string', 'null'] },
        isActive: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
      },
    },
  },
  indexes: [
    { key: { latitude: 1, longitude: 1 } },
    { key: { name: 1 }, options: { unique: true } },
  ],
};
