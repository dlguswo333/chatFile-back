const data = require('./data.json');
const crypto=require('crypto');

function validateIdLen(id) {
  return (data['min_id_len'] <= id.length || id.length <= data['max_id_len']);
}

function validatePwLen(pw) {
  return (data['min_pw_len'] <= pw.length || pw.length <= data['max_pw_len']);
}

const getSalt = () => {
  return crypto.randomBytes(4).toString('hex');
};

/**
 * @param {crypto.BinaryLike} data Original data.
 * @returns {string} Hexadecimal representation of the hash value.
 */
const getHashValue=(data)=>{
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = { validateIdLen, validatePwLen, getSalt, getHashValue };