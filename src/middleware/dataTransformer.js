const logger = require('../config/logger');

// Comprehensive transformation between snake_case and camelCase
const snakeToCamel = (str) => 
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const camelToSnake = (str) => 
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const transformKeys = (obj, transformer) => {
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeys(item, transformer));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const transformedKey = transformer(key);
      result[transformedKey] = transformKeys(obj[key], transformer);
      return result;
    }, {});
  }
  return obj;
};

// Request transformer: camelCase → snake_case
const requestTransformer = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug('📥 Original request body:', JSON.stringify(req.body, null, 2));
    req.body = transformKeys(req.body, camelToSnake);
    logger.debug('📥 Transformed request body:', JSON.stringify(req.body, null, 2));
  }
  next();
};

// Response transformer: snake_case → camelCase
const responseTransformer = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    logger.debug('📤 Original response:', JSON.stringify(data, null, 2));
    const transformedData = transformKeys(data, snakeToCamel);
    logger.debug('📤 Transformed response:', JSON.stringify(transformedData, null, 2));
    originalJson.call(this, transformedData);
  };
  next();
};

module.exports = {
  requestTransformer,
  responseTransformer
};