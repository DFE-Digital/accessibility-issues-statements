const { db } = require('../db');

/**
 * Create a new comment
 * @param {Object} commentData - Comment data including issue_id, user_id, and content
 * @returns {Promise<Object>} Created comment
 */
async function createComment(commentData) {
  const [comment] = await db('comments')
    .insert(commentData)
    .returning('*');

  return comment;
}

/**
 * Get comments for an issue with user details
 * @param {string} issueId - Issue ID (UUID)
 * @returns {Promise<Array>} Array of comments with user details
 */
async function getIssueComments(issueId) {
  return db('comments')
    .select(
      'comments.*',
      'users.first_name',
      'users.last_name',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as created_by_name")
    )
    .leftJoin('users', 'comments.user_id', 'users.id')
    .where('comments.issue_id', issueId)
    .orderBy('comments.created_at', 'desc');
}

/**
 * Delete a comment
 * @param {string} commentId - Comment ID (UUID)
 * @param {string} userId - User ID (UUID) of the user trying to delete
 * @returns {Promise<boolean>} True if comment was deleted, false if not found or not authorized
 */
async function deleteComment(commentId, userId) {
  const [comment] = await db('comments')
    .where({ id: commentId })
    .select('user_id');

  if (!comment || comment.user_id !== userId) {
    return false;
  }

  await db('comments')
    .where({ id: commentId })
    .del();

  return true;
}

module.exports = {
  createComment,
  getIssueComments,
  deleteComment
}; 