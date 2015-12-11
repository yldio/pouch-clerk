'use strict';

var extend = require('xtend');
var inherits = require('inherits');
var EventEmitter = require('events');

var defaultOptions = {
  initialState: 'start',
  reconnectMaxTimeoutMS: 3000,
}

inherits(Clerk, EventEmitter);

module.exports = Clerk;

function Clerk(_options) {
  if (! (this instanceof Clerk)) {
    return new Clerk(_options);
  }

  EventEmitter.call(this);

  this._options = extend({}, defaultOptions, _options);
  this.states = new EventEmitter();
}

Clerk.prototype.reactTo = function reactTo(database) {
  var clerk = this;

  var changes = database.changes({
    live: true,
    include_docs: true,
  });

  var onChange = this._onChange.bind(this);

  changes.on('change', onChange);
  changes.on('error', onChangesError);

  clerk.once('stop', onClerkStop);

  function onChangesError() {
    changes.removeListener('change', onChange);
    changes.cancel();

    setTimeout(clerk.reactTo.bind(clerk, database), clerk._reconnectTimeout());
  }

  function onClerkStop() {
    changes.removeListener('change', onChange);
    changes.cancel();
  }
};

Clerk.prototype.stop = function stop() {
  this.emit('stop');
};

Clerk.prototype._onChange = function onChange(change) {

};

Clerk.prototype._reconnectTimeout = function _reconnectTimeout() {
  return Math.floor(Math.random() * this._options.reconnectMaxTimeoutMS);
}