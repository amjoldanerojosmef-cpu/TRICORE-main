const {
  saveSubmission,
  validateServiceRequest,
} = require("../lib/submissions");

module.exports = async function handler(req, res) {
  return saveSubmission(req, res, "service_requests", validateServiceRequest);
};
