'use strict';

const Joi = require('joi');

const schema = Joi.object().required().keys({
  initialState: Joi.string().required().min(1),
  finalState: Joi.array().items(Joi.string()).min(1),
  reconnectMaxTimeoutMS: Joi.number().integer(),
  transitions: Joi.object(),
  asyncUpdaters: Joi.array().items(Joi.object().keys({
    start: Joi.func().required(),
    finish: Joi.func().required(),
  }).unknown(false)),
});

module.exports = function validate(options) {
  return Joi.validate(options, schema);
};
