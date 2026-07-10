import { getDB } from '../db.js';

/**
 * Log an audit trail entry.
 *
 * @param {Object} params
 * @param {string} params.userId - The user performing the action
 * @param {string} params.action - Action performed (e.g. 'created', 'updated', 'deleted')
 * @param {string} params.module - Module name (e.g. 'fleet', 'fileMovement', 'attendance')
 * @param {string} params.entityType - Entity type (e.g. 'vehicle', 'trip', 'caseFile')
 * @param {string} [params.entityId] - ID of the affected entity
 * @param {*} [params.previousValue] - Value before the change (serialized)
 * @param {*} [params.newValue] - Value after the change (serialized)
 * @param {string} [params.stationId] - Court station ID if applicable
 * @param {string} [params.ipAddress] - Request IP address
 * @param {string} [params.description] - Human-readable description
 */
export async function logAudit({
  userId,
  userName = null,
  action,
  module,
  entityType,
  entityId = null,
  previousValue = null,
  newValue = null,
  stationId = null,
  ipAddress = null,
  description = null,
}) {
  try {
    const db = getDB();
    const entry = {
      userId,
      userName: userName || null,
      action,
      module,
      entityType,
      entityId: entityId ? String(entityId) : null,
      previousValue: previousValue != null ? previousValue : null,
      newValue: newValue != null ? newValue : null,
      stationId: stationId ? String(stationId) : null,
      ipAddress,
      description,
      timestamp: new Date(),
    };
    await db.collection('audit_logs').insertOne(entry);
  } catch (error) {
    // Audit logging should never crash the caller
    console.error('Audit log error (non-fatal):', error.message);
  }
}

/**
 * Serialize a document for audit comparison (strip _id, dates not useful for diff).
 */
export function serializeForAudit(doc) {
  if (!doc) return null;
  const { _id, createdAt, updatedAt, ...rest } = doc;
  return rest;
}

/**
 * Compute a simple diff between two objects.
 * Returns { field, from, to }[] for changed fields.
 */
export function computeDiff(before, after) {
  if (!before || !after) return [];
  const changes = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (key === '_id' || key === 'createdAt' || key === 'updatedAt') continue;
    const from = before[key];
    const to = after[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field: key, from, to });
    }
  }
  return changes;
}
