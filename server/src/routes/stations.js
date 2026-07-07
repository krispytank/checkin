import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequired } from '../middleware/validation.js';

const router = Router();

// GET /api/stations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    const stations = await db.collection('stations')
      .find()
      .sort({ name: 1 })
      .toArray();

    res.json({ success: true, data: stations });
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let station;
    try {
      station = await db.collection('stations').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid station ID' });
    }

    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    res.json({ success: true, data: station });
  } catch (error) {
    next(error);
  }
});

// POST /api/stations
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, latitude, longitude, radiusMeters, address, city, phoneNumber } = req.body;

    // Validation
    const _err = validateRequired(name, 'Name'); if (_err) {
      return res.status(400).json({ success: false, message: _err });
    }
    if (latitude === undefined || latitude === null) {
      return res.status(400).json({ success: false, message: 'Latitude is required' });
    }
    if (longitude === undefined || longitude === null) {
      return res.status(400).json({ success: false, message: 'Longitude is required' });
    }
    if (radiusMeters === undefined || radiusMeters === null) {
      return res.status(400).json({ success: false, message: 'Radius is required' });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude must be between -90 and 90' 
      });
    }
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        success: false, 
        message: 'Longitude must be between -180 and 180' 
      });
    }
    if (radiusMeters < 10 || radiusMeters > 1000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Radius must be between 10 and 1000 meters' 
      });
    }

    const db = getDB();

    // Check for duplicate name
    const existing = await db.collection('stations').findOne({ name: name.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'Station name already exists' 
      });
    }

    // Create station
    const newStation = {
      name: name.trim().toUpperCase(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radiusMeters: parseInt(radiusMeters),
      address: address?.trim() || null,
      city: city?.trim() || null,
      phoneNumber: phoneNumber?.trim() || null,
      isActive: true,
      createdAt: new Date(),
    };

    const result = await db.collection('stations').insertOne(newStation);

    res.status(201).json({ 
      success: true, 
      data: { ...newStation, _id: result.insertedId } 
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/stations/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, radiusMeters, address, city, phoneNumber, isActive } = req.body;

    const db = getDB();

    let station;
    try {
      station = await db.collection('stations').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid station ID' });
    }

    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    // Build update object
    const updateData = { updatedAt: new Date() };

    if (name && name !== station.name) {
      const existing = await db.collection('stations').findOne({ 
        name: name.trim().toUpperCase(), 
        _id: { $ne: new ObjectId(id) } 
      });
      if (existing) {
        return res.status(409).json({ 
          success: false, 
          message: 'Station name already exists' 
        });
      }
      updateData.name = name.trim().toUpperCase();
    }

    if (latitude !== undefined) {
      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({ 
          success: false, 
          message: 'Latitude must be between -90 and 90' 
        });
      }
      updateData.latitude = parseFloat(latitude);
    }

    if (longitude !== undefined) {
      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({ 
          success: false, 
          message: 'Longitude must be between -180 and 180' 
        });
      }
      updateData.longitude = parseFloat(longitude);
    }

    if (radiusMeters !== undefined) {
      if (radiusMeters < 10 || radiusMeters > 1000) {
        return res.status(400).json({ 
          success: false, 
          message: 'Radius must be between 10 and 1000 meters' 
        });
      }
      updateData.radiusMeters = parseInt(radiusMeters);
    }

    if (address !== undefined) updateData.address = address?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    await db.collection('stations').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedStation = await db.collection('stations').findOne({ 
      _id: new ObjectId(id) 
    });

    res.json({ success: true, data: updatedStation });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/stations/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    let station;
    try {
      station = await db.collection('stations').findOne({ _id: new ObjectId(id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid station ID' });
    }

    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    // Check if station is assigned to any users
    const usersWithStation = await db.collection('users').countDocuments({ 
      stationId: id 
    });

    if (usersWithStation > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete station: ${usersWithStation} user(s) are assigned to it` 
      });
    }

    await db.collection('stations').deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true, message: 'Station deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
