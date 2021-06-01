const data = require('./data.json');

function validateIdLen(id) {
  return (data['min_id_len'] <= id.length || id.length <= data['max_id_len']);
}

function validatePwLen(pw) {
  return (data['min_pw_len'] <= pw.length || pw.length <= data['max_pw_len']);
}

module.exports = { validateIdLen, validatePwLen };