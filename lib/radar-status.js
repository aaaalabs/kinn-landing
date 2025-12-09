/**
 * Radar Status Utility
 *
 * Provides backward-compatible handling for both old and new status schemas:
 * - Old: reviewed (true/false) + rejected (true/false)
 * - New: status ("pending" | "approved" | "rejected")
 */

/**
 * Get the status of an event (supports both schemas)
 * @param {Object} event - Event object from Redis
 * @returns {string} - "pending" | "approved" | "rejected"
 */
export function getEventStatus(event) {
  if (!event) return 'pending';

  // New schema - direct status field
  if (event.status) {
    return event.status;
  }

  // Old schema - derive from reviewed/rejected
  const isReviewed = event.reviewed === true || event.reviewed === 'true';
  const isRejected = event.rejected === true || event.rejected === 'true';

  if (isRejected) {
    return 'rejected';
  } else if (isReviewed) {
    return 'approved';
  } else {
    return 'pending';
  }
}

/**
 * Check if an event is approved (supports both schemas)
 * @param {Object} event - Event object from Redis
 * @returns {boolean}
 */
export function isEventApproved(event) {
  if (!event) return false;

  // New schema
  if (event.status) {
    return event.status === 'approved';
  }

  // Old schema
  const isReviewed = event.reviewed === true || event.reviewed === 'true';
  const isRejected = event.rejected === true || event.rejected === 'true';

  return isReviewed && !isRejected;
}

/**
 * Check if an event is rejected (supports both schemas)
 * @param {Object} event - Event object from Redis
 * @returns {boolean}
 */
export function isEventRejected(event) {
  if (!event) return false;

  // New schema
  if (event.status) {
    return event.status === 'rejected';
  }

  // Old schema
  const isRejected = event.rejected === true || event.rejected === 'true';
  return isRejected;
}

/**
 * Check if an event is pending (supports both schemas)
 * @param {Object} event - Event object from Redis
 * @returns {boolean}
 */
export function isEventPending(event) {
  if (!event) return true;

  // New schema
  if (event.status) {
    return event.status === 'pending';
  }

  // Old schema
  const isReviewed = event.reviewed === true || event.reviewed === 'true';
  return !isReviewed;
}

/**
 * Set event status (uses new schema)
 * @param {string} status - "pending" | "approved" | "rejected"
 * @returns {Object} - Object to pass to kv.hset
 */
export function setEventStatus(status) {
  const updates = {
    status: status
  };

  // Add timestamp fields
  const timestamp = new Date().toISOString();

  switch(status) {
    case 'approved':
      updates.approvedAt = timestamp;
      break;
    case 'rejected':
      updates.rejectedAt = timestamp;
      break;
    case 'pending':
      // Clear approval/rejection timestamps when resetting to pending
      updates.approvedAt = null;
      updates.rejectedAt = null;
      break;
  }

  return updates;
}

/**
 * Create initial event data with pending status
 * @param {Object} eventData - Event data to store
 * @returns {Object} - Event data with status field
 */
export function createPendingEvent(eventData) {
  return {
    ...eventData,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}