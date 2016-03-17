'use strict';

var debug = require('debug')('pouch-clerk:clerk');
var extend = require('xtend');
var inherits = require('inherits');
var EventEmitter = require('events');
var Databases = require('./databases');
var normalizeError = require('./normalize-error');

var defaultOptions = {
  initialState: 'start',
  reconnectMaxTimeoutMS: 3000,
  transitions: {}
};

inherits(Clerk, EventEmitter);

module.exports = Clerk;

function Clerk(_options) {
  if (! (this instanceof Clerk)) {
    return new Clerk(_options);
  }
  var self = this;

  EventEmitter.call(this);

  this._pending = 0;
  this._options = extend({}, defaultOptions, _options);

  this._databases = Databases(this._options);
  this._databases.on('change', onChange);

  function onChange(change, db) {
    self._onChange(change, db);
  }
}

Clerk.prototype._onChange = function onChange(doc, db) {
  var clerk = this;

  if (! doc.clerk_state) {
    doc.clerk_state = {
      state: clerk._options.initialState,
    };
  }
  debug('change doc: %j', doc);
  var state = doc.clerk_state.state;
  debug('doc is on state %s — emitting', state);

  var handler = clerk._options.transitions[state];
  if (handler) {
    clerk._begin();
    handler.call(null, doc, next);
  }

  function next(err, newState) {
    debug('clerk advanced to new state %j', newState);
    clerk._end();
    if (err) {
      clerk._handleUserError(err, doc, db);
    } else if (newState && newState != state) {
      clerk._transition(newState, doc, db);
    }
  }
};

Clerk.prototype._transition = function _transition(newState, doc, db) {
  var clerk = this;
  clerk._begin();
  doc.clerk_state.state = newState;
  db.put(doc, onPut);

  function onPut(err) {
    clerk._end();
    if (err && err.status !== 409) {
      clerk.emit('error', err);
    }
  }
};

Clerk.prototype._handleUserError = function _handleUserError(_err, doc, db) {
  var err = normalizeError(_err);
  err.fromState = doc.clerk_state.state;
  doc.clerk_state.errors = (doc.clerk_state.errors || []).concat(err);
  doc.clerk_state.lastError = err;
  this._transition('error', doc, db);
};

Clerk.prototype._reconnectTimeout = function _reconnectTimeout() {
  return Math.floor(Math.random() * this._options.reconnectMaxTimeoutMS);
};

Clerk.prototype._begin = function begin() {
  this._pending ++;
}

Clerk.prototype._end = function begin() {
  this._pending --;
  if (! this._pending) {
    this.emit('flushed');
  }
};

Clerk.prototype.add = function add(db, name) {
  this._databases.add(db, name);
}

Clerk.prototype.remove = function remove(db) {
  this._databases.remove(db);
}

Clerk.prototype.stop = function stop(callback) {
  debug('stopping...');
  this._databases.removeAll();
  var clerk = this;
  if (! clerk._pending) {
    debug('no more pending operations');
    callback();
  } else {
    debug('waiting for %d pending operations', clerk._pending);
    clerk.once('flushed', function() {
      debug('flushed');
      callback();
    });
  }
};
