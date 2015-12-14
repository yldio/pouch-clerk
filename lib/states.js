'use strict';

var EventEmitter = require('events');
var inherits = require('inherits');

inherits(States, EventEmitter);

module.exports = States;

function States() {
  EventEmitter.apply(this, arguments);
}

States.prototype.on = States.prototype.addListener = addListener;

function addListener(state) {
  if (this.listenerCount(state)) {
    throw new Error('tried to register more than one handler for state ' + state);
  }
  // console.log('adding listener for state', state);
  this.constructor.super_.prototype.addListener.apply(this, arguments);
};