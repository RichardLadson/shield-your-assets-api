// src/services/validation/validationErrors.js
class ValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ValidationError';
    }
  }
  
  class StateNotFoundError extends Error {
    constructor(message) {
      super(message);
      this.name = 'StateNotFoundError';
    }
  }
  
  module.exports = {
    ValidationError,
    StateNotFoundError
  };