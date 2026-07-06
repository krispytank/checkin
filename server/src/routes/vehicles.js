import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { authenticate, authorizeModule } from '../middleware/auth.js';
import { validateRequired, validatePagination, escapeRegex } from '../middleware/validation.js';
import { generateQRDataURL, generateStickerPDF, generateBatchStickerPDF } from '../utils/qr.js';

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL || process.env.VITE_API_URL || 'http://localhost:5173';
const CURRENT_YEAR = new Date().getFullYear();

// GET /api/vehicles - List all vehicles
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, status, category, page = 1, limit = 50 } = req.query;
    const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit);

    const db = getDB();
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { plateNumber: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [vehicles, total] = await Promise.all([
      db.collection('vehicles').find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('vehicles').countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: vehicles,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/vehicles/available - List available vehicles
router.get('/available', authenticate, async (req, res, next) => {
  try {
    const { category } = req.query;
    const db = getDB();
    const filter = { status: 'available' };
    if (category) filter.category = category;

    const vehicles = await db.collection('vehicles').find(filter).sort({ name: 1 }).toArray();
    res.json({ success: true, data: vehicles });
  } catch (error) {
    next(error);
  }
});

// GET /api/vehicles/qr-pdf/batch - Export multiple QR stickers as PDF (admin only)
router.get('/qr-pdf/batch', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ success: false, message: 'Vehicle IDs are required' });
    }

    const db = getDB();
    const idArray = ids.split(',').map((id) => id.trim());

    let vehicles;
    try {
      vehicles = await db.collection('vehicles').find({
        _id: { $in: idArray.map((id) => new ObjectId(id)) },
      }).toArray();
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID format' });
    }

    if (vehicles.length === 0) {
      return res.status(404).json({ success: false, message: 'No vehicles found' });
    }

    const vehiclesWithQR = vehicles.filter((v) => v.qrCode && v.qrStatus === 'active');
    if (vehiclesWithQR.length === 0) {
      return res.status(400).json({ success: false, message: 'No vehicles with active QR codes found' });
    }

    const pdfBuffer = await generateBatchStickerPDF(vehiclesWithQR, CLIENT_URL);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="vehicle-qr-stickers.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// POST /api/vehicles/qr/generate-year - Generate QR codes for all vehicles for current year (admin only)
router.post('/qr/generate-year', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    const year = new Date().getFullYear();

    // Find vehicles that need QR for this year (no QR or different year)
    const vehicles = await db.collection('vehicles').find({
      status: { $ne: 'deactivated' },
      $or: [
        { qrGeneratedYear: null },
        { qrGeneratedYear: { $ne: year } },
      ],
    }).toArray();

    if (vehicles.length === 0) {
      return res.json({ success: true, data: { generated: 0, message: 'All vehicles already have QR codes for this year' } });
    }

    let generated = 0;
    for (const vehicle of vehicles) {
      try {
        const { dataUrl } = await generateQRDataURL(
          vehicle._id.toString(),
          vehicle.plateNumber,
          CLIENT_URL
        );
        await db.collection('vehicles').updateOne(
          { _id: vehicle._id },
          { $set: { qrCode: dataUrl, qrGeneratedYear: year, qrStatus: 'active', updatedAt: new Date() } }
        );
        generated++;
      } catch (err) {
        console.warn(`QR generation failed for vehicle ${vehicle.plateNumber}:`, err.message);
      }
    }

    res.json({
      success: true,
      data: { generated, total: vehicles.length, year },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/vehicles/:id/qr-pdf - Export single vehicle QR sticker as PDF
router.get('/:id/qr-pdf', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (!vehicle.qrCode || vehicle.qrStatus !== 'active') {
      return res.status(400).json({ success: false, message: 'No active QR code. Generate QR for current year first.' });
    }

    const pdfBuffer = await generateStickerPDF(vehicle.qrCode, vehicle.name, vehicle.plateNumber);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="qr-${vehicle.plateNumber}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// GET /api/vehicles/:id/qr - Get QR code data URL for a vehicle
router.get('/:id/qr', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (!vehicle.qrCode || vehicle.qrStatus !== 'active') {
      return res.status(400).json({ success: false, message: 'No active QR code. Generate QR for current year first.' });
    }

    res.json({
      success: true,
      data: {
        qrCode: vehicle.qrCode,
        plateNumber: vehicle.plateNumber,
        name: vehicle.name,
        qrGeneratedYear: vehicle.qrGeneratedYear,
        qrStatus: vehicle.qrStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/vehicles/:id/qr/generate - Generate QR for a single vehicle for current year (admin only)
router.post('/:id/qr/generate', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (vehicle.qrGeneratedYear === CURRENT_YEAR && vehicle.qrStatus === 'active') {
      return res.status(400).json({ success: false, message: 'QR code already generated for this year. Cannot regenerate until next year.' });
    }

    const { dataUrl } = await generateQRDataURL(
      vehicle._id.toString(),
      vehicle.plateNumber,
      CLIENT_URL
    );

    await db.collection('vehicles').updateOne(
      { _id: vehicle._id },
      { $set: { qrCode: dataUrl, qrGeneratedYear: CURRENT_YEAR, qrStatus: 'active', updatedAt: new Date() } }
    );

    res.json({
      success: true,
      data: {
        qrCode: dataUrl,
        plateNumber: vehicle.plateNumber,
        name: vehicle.name,
        qrGeneratedYear: CURRENT_YEAR,
        qrStatus: 'active',
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/vehicles/:id/deactivate - Deactivate vehicle and revoke QR (admin only)
router.post('/:id/deactivate', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (vehicle.status === 'deactivated') {
      return res.status(400).json({ success: false, message: 'Vehicle is already deactivated' });
    }

    // Check if vehicle has active trips
    const activeTrips = await db.collection('trips').countDocuments({
      vehicleId: req.params.id,
      status: { $in: ['approved', 'in-progress'] },
    });

    if (activeTrips > 0) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate vehicle with active trips' });
    }

    await db.collection('vehicles').updateOne(
      { _id: vehicle._id },
      {
        $set: {
          status: 'deactivated',
          qrStatus: 'revoked',
          deactivatedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    res.json({ success: true, message: 'Vehicle deactivated and QR code revoked' });
  } catch (error) {
    next(error);
  }
});

// POST /api/vehicles/:id/reactivate - Reactivate vehicle (admin only)
router.post('/:id/reactivate', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (vehicle.status !== 'deactivated') {
      return res.status(400).json({ success: false, message: 'Vehicle is not deactivated' });
    }

    await db.collection('vehicles').updateOne(
      { _id: vehicle._id },
      {
        $set: {
          status: 'available',
          deactivatedAt: null,
          updatedAt: new Date(),
        },
        $unset: { qrCode: '', qrGeneratedYear: '', qrStatus: '' },
      }
    );

    res.json({ success: true, message: 'Vehicle reactivated. QR code needs to be generated for current year.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/vehicles/:id - Get single vehicle
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = getDB();
    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({ success: true, data: vehicle });
  } catch (error) {
    next(error);
  }
});

// POST /api/vehicles - Create vehicle (admin only)
router.post('/', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const { name, plateNumber, employeeNo = '', category = 'sedan', capacity = 4, description = '' } = req.body;

    const nameError = validateRequired(name, 'Name');
    if (nameError) return res.status(400).json({ success: false, message: nameError });
    const plateError = validateRequired(plateNumber, 'Plate Number');
    if (plateError) return res.status(400).json({ success: false, message: plateError });

    const db = getDB();

    const existing = await db.collection('vehicles').findOne({ plateNumber: plateNumber.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Plate number already exists' });
    }

    // Validate max 2 cars per employee
    if (employeeNo.trim()) {
      const activeCars = await db.collection('vehicles').countDocuments({
        employeeNo: employeeNo.trim(),
        status: { $ne: 'deactivated' },
      });
      if (activeCars >= 2) {
        return res.status(400).json({
          success: false,
          message: `Employee ${employeeNo.trim()} already has 2 active vehicles. Maximum limit reached.`,
        });
      }
    }

    const newVehicle = {
      name: name.trim(),
      plateNumber: plateNumber.toUpperCase().trim(),
      employeeNo: employeeNo.trim(),
      category,
      capacity: parseInt(capacity) || 4,
      description: description.trim(),
      status: 'available',
      mileage: 0,
      qrCode: null,
      qrGeneratedYear: null,
      qrStatus: 'inactive',
      deactivatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('vehicles').insertOne(newVehicle);
    newVehicle._id = result.insertedId;

    res.status(201).json({ success: true, data: newVehicle });
  } catch (error) {
    next(error);
  }
});

// PUT /api/vehicles/:id - Update vehicle (admin only)
router.put('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const { name, plateNumber, employeeNo, category, capacity, description, status, mileage } = req.body;
    const db = getDB();

    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name.trim();
    if (plateNumber) updateData.plateNumber = plateNumber.toUpperCase().trim();
    if (employeeNo !== undefined) {
      const newEmpNo = employeeNo.trim();
      // Validate max 2 cars if changing employee
      if (newEmpNo && newEmpNo !== vehicle.employeeNo) {
        const activeCars = await db.collection('vehicles').countDocuments({
          employeeNo: newEmpNo,
          status: { $ne: 'deactivated' },
          _id: { $ne: vehicle._id },
        });
        if (activeCars >= 2) {
          return res.status(400).json({
            success: false,
            message: `Employee ${newEmpNo} already has 2 active vehicles. Maximum limit reached.`,
          });
        }
      }
      updateData.employeeNo = newEmpNo;
    }
    if (category) updateData.category = category;
    if (capacity) updateData.capacity = parseInt(capacity);
    if (description !== undefined) updateData.description = description.trim();
    if (status) updateData.status = status;
    if (mileage !== undefined) updateData.mileage = parseInt(mileage);

    // If plate number changed and QR exists, invalidate QR (needs regeneration)
    if (plateNumber && plateNumber.toUpperCase().trim() !== vehicle.plateNumber) {
      if (vehicle.qrCode) {
        updateData.qrCode = null;
        updateData.qrGeneratedYear = null;
        updateData.qrStatus = 'inactive';
      }
    }

    await db.collection('vehicles').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    const updated = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/vehicles/:id - Delete vehicle (admin only)
router.delete('/:id', authenticate, authorizeModule('fleet', 'admin'), async (req, res, next) => {
  try {
    const db = getDB();
    let vehicle;
    try {
      vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(req.params.id) });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle ID' });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    // Check if vehicle has active trips
    const activeTrips = await db.collection('trips').countDocuments({
      vehicleId: req.params.id,
      status: { $in: ['approved', 'in-progress'] },
    });

    if (activeTrips > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete vehicle with active trips' });
    }

    await db.collection('vehicles').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
