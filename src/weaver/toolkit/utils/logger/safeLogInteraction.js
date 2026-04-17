import { logger } from './logger';

/**
 * Logs an interaction safely, retrying on failure and storing failed logs locally.
 * @param {string} actionType
 * @param {object} data
 * @param {number} [retries=3]
 */

export async function safeLogInteraction(actionType, data, retries = 3) {
  try {
    return await logger.logInteraction(actionType, {
      ...data,
      client_timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Logging failed for ${actionType}:`, error);

    const failedLogs = JSON.parse(localStorage.getItem('failedLogs') || '[]');
    failedLogs.push({
      actionType,
      data,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
    localStorage.setItem('failedLogs', JSON.stringify(failedLogs));

    if (retries === 0) throw error;
    await new Promise(res => setTimeout(res, 1000));
    return safeLogInteraction(actionType, data, retries - 1);
  }
}
