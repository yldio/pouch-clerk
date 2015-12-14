'use strict';

var debug = require('debug')('pouch-clerk');
var extend = require('xtend');
var inherits = require('inherits');
var EventEmitter = require('events');

var defaultOptions = {
  initialState: 'start',
  reconnectMaxTimeoutMS: 3000,
};

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

  var onChange = this._onChange.bind(this, database);

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

Clerk.prototype._onChange = function onChange(database, change) {
  debug('change: %j', change);
  var clerk = this;

  var doc = change.doc;
  if (! doc.clerk_state) {
    doc.clerk_state = {
      state: clerk._options.initialState,
    };
  }
  var state = doc.clerk_state.state;
  debug('doc is on state %s — emitting', state);
  clerk.states.emit(state, doc, calledback);

  function calledback(_err, newState) {
    var err = _err;
    debug('clerk advanced to new state %j', newState);
    if (! err && newState && state === newState) {
      debug('new state is the same as previous');
      err = new Error('same state as previous: ' + newState);
      clerk.emit('error', err);
    } else if (err) {
      clerk._onDocError(database, doc, err);
    } else if (newState) {
      debug('saving new doc state: %s', newState);
      doc.clerk_state = extend(doc.clerk_state, {
        state: newState,
        when: new Date(),
      });
      clerk._saveDoc(database, doc);
    }
  }
};

Clerk.prototype._reconnectTimeout = function _reconnectTimeout() {
  return Math.floor(Math.random() * this._options.reconnectMaxTimeoutMS);
};

Clerk.prototype._onDocError = function _onDocError(database, doc, err) {
  debug('doc error: %j', err.message);
  doc.clerk_state = extend(doc.clerk_state, {
    state: 'error',
    lastError: {
      previousState: doc.clerk_state.state,
      message: err.message,
      stack: err.stack,
    },
    when: new Date(),
  });
  this._saveDoc(database, doc);
};

Clerk.prototype._saveDoc = function _saveDoc(database, doc) {
  debug('save doc:', doc);
  var clerk = this;

  database.put(doc, onPut);

  function onPut(err) {
    if (err && err.status !== 409) {
      clerk.emit('error', err);
    }
  }
};
