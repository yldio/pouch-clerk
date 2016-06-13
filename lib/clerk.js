'use strict';

var debug = require('debug')('pouch-clerk:clerk');
var extend = require('xtend');
var once = require('once');
var inherits = require('inherits');
var EventEmitter = require('events');
var Databases = require('./databases');
var normalizeError = require('./normalize-error');
var AsyncUpdater = require('./async-updater');
var validateOptions = require('./validate-options');

var defaultOptions = {
  initialState: 'start',
  finalState: 'finished',
  reconnectMaxTimeoutMS: 3000,
  transitions: {},
  asyncUpdaters: [],
};

inherits(Clerk, EventEmitter);

module.exports = Clerk;

function Clerk(_options) {
  if (! (this instanceof Clerk)) {
    return new Clerk(_options);
  }
  const self = this;

  EventEmitter.call(this);

  this._pending = 0;
  this._options = extend({}, defaultOptions, _options);

  this._databases = Databases(this._options);
  this._databases.on('change', onChange);

  function onChange(change, db, wrapperDB) {
    self._onChange(change, db, wrapperDB);
  }

  if (! Array.isArray(this._options.finalState)) {
    this._options.finalState = [this._options.finalState];
  }

  if (! Array.isArray(this._options.asyncUpdaters)) {
    this._options.asyncUpdaters = [this._options.asyncUpdaters];
  }

  var validation = validateOptions(this._options);
  if (validation.error) {
    throw validation.error;
  }

  this._asyncUpdaters = this._options.asyncUpdaters.map(
    function eachUpdater(asyncUpdater) {
      const options = Object.assign({}, asyncUpdater, {
        finalStates: self._options.finalState,
      });
      return AsyncUpdater(options);
    }
  );
}

Clerk.prototype._onChange = function onChange(doc, db, wrapperDB) {
  const clerk = this;

  if (! doc.clerk_state) {
    doc.clerk_state = {
      state: clerk._options.initialState,
    };
  }
  debug('change doc: %j', doc);

  if (!doc.clerk_state.handled) {
    const state = doc.clerk_state.state;
    debug('doc is currently on state %s', state);

    const handler = clerk._options.transitions[state];
    if (handler) {
      debug('have handler for state %j', state);
      clerk._callHandler(handler, db, doc, state);
    } else {
      /* istanbul ignore else */
      if (state === 'error') {
        debug('no handler for error state, emitting on clerk');
        let message = 'Unhandled user error: ';

        /* istanbul ignore else */
        if (doc.clerk_state.lastError) {
          message += doc.clerk_state.lastError.message;
        } else {
          message += 'Unknown error';
        }
        clerk.emit('error', new Error(message));
      }
    }

    process.nextTick(function onNextTick() {
      clerk._asyncUpdaters.forEach(function eachUpdater(asyncUpdater) {
        process.nextTick(function onNextTick2() {
          asyncUpdater.change(wrapperDB, doc);
        });
      });
    });
  }
};

Clerk.prototype._callHandler = function _callHandler(handler, db, doc, state) {
  debug('calling handler for state %j, doc %j', state, doc);
  const clerk = this;
  clerk._begin();
  if (state === 'error') {
    let error = new Error(doc.clerk_state.lastError.message);
    error = extend(error, doc.clerk_state.lastError);
    handler.call(null, error, doc, once(next));
  } else {
    handler.call(null, doc, once(next));
  }

  function next(err, _newState, again) {
    debug('next called: err=%j, newState=%j', err, _newState);
    clerk._end();
    if (err) {
      debug('next calledback with error: %j', err);
      clerk._handleUserError(err, doc, db);
    } else {
      var newState = _newState;
      if (newState && !again && newState === state) {
        newState = undefined;
      }
      debug('clerk advanced to new state %j', newState);
      clerk._transition(newState, doc, db);
    }
  }
};

Clerk.prototype._transition = function _transition(newState, doc, db) {
  const clerk = this;
  clerk._begin();
  if (! newState) {
    doc.clerk_state.handled = true;
  } else {
    doc.clerk_state.state = newState;
    doc.clerk_state.handled = false;
  }
  db.put(doc, onPut);

  function onPut(err) {
    clerk._end();
    if (err) {
      clerk.emit('error', err);
    }
  }
};

Clerk.prototype._handleUserError = function _handleUserError(_err, doc, db) {
  debug('handling user error %s', _err.message);
  const err = normalizeError(_err);
  debug('normalized error:', err);
  err.fromState = doc.clerk_state.state;
  doc.clerk_state.errors = (doc.clerk_state.errors || []).concat(err);
  doc.clerk_state.lastError = err;
  this._transition('error', doc, db);
};

Clerk.prototype._begin = function begin() {
  this._pending ++;
};

Clerk.prototype._end = function begin() {
  this._pending --;
  if (! this._pending) {
    this.emit('flushed');
  }
};

Clerk.prototype.add = function add(db, name) {
  this._databases.add(db, name);
};

Clerk.prototype.has = function has(name) {
  return this._databases.has(name);
};

Clerk.prototype.remove = function remove(db) {
  this._databases.remove(db);
};

Clerk.prototype.stop = function stop(callback) {
  debug('stopping...');

  this._databases.removeAll();

  this._asyncUpdaters.forEach(function eachUpdater(asyncUpdater) {
    asyncUpdater.stopAll();
  });

  if (! this._pending) {
    debug('no more pending operations');
    callback();
  } else {
    debug('waiting for %d pending operations', this._pending);
    this.once('flushed', function onFlush() {
      debug('flushed');
      callback();
    });
  }
};
