const {
  saveSubmission,
  validateContactMessage,
} = require("../lib/submissions");

module.exports = async function handler(req, res) {
  return saveSubmission(req, res, "contact_messages", validateContactMessage);
};
