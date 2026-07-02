import { Router } from 'express';
import { publicConfig } from '../config.js';

const router = Router();

// GET /api/config
router.get('/', (req, res) => {
  res.json({ success: true, data: publicConfig });
});

export default router;
