'use strict';

var debug = require('debug')('pouch-clerk:databases');
var extend = require('xtend');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

inherits(Databases, EventEmitter);

module.exports = Databases;

var defaultOptions = {
  reconnectMaxTimeoutMS: 3000,
};

function Databases(options) {
  if (! (this instanceof Databases)) {
    return new Databases(options);
  }
  EventEmitter.call(this);
  this._options = extend({}, defaultOptions, options);
  this._databases = {};
  this._lastTimeout = 0;
}

Databases.prototype.add = function add(db, _name) {
  var name = _name || db._db_name;
  debug('adding database named %j', name);
  var dbWrapper = {
    name: name,
    db: db,
    changes: undefined,
    since: undefined,
  };
  this._databases[name] = dbWrapper;

  this._listenTo(dbWrapper);
};

Databases.prototype._listenTo = function _listenTo(db) {
  debug('going to listen to changes on database %j', db.name);
  var self = this;

  var changes = db.changes = db.db.changes({
    live: true,
    since: db.since,
  });

  changes.on('change', onChange);
  changes.on('error', onChangesError);

  function onChange(change) {
    debug('change on %j: %j', db.name, change);
    self._lastTimeout = 0;
    db.since = change.seq;
    // TODO: persist since
    var rev = change.changes[change.changes.length - 1].rev;
    db.db.get(change.id, got);

    function got(err, doc) {
      /* istanbul ignore else */
      if (rev === doc._rev) {
        debug('revision matches');
        self.emit('change', doc, db.db);
      }
    }
  }

  function onChangesError() {
    changes.removeListener('change', onChange);
    changes.removeListener('error', onChangesError);
    changes.cancel();

    setTimeout(self._listenTo.bind(self, db), self._reconnectTimeout());
  }
};

Databases.prototype._stopListeningTo = function _stopListeningTo(db) {
  db.changes.cancel();
  db.changes = undefined;
};

Databases.prototype.remove = function remove(_db) {
  var db = _db;
  var name;
  if (typeof db === 'string') {
    name = db;
  } else {
    name = db._db_name;
  }
  db = name && this._databases[name];
  if (db) {
    this._stopListeningTo(db);
    delete this._databases[name];
  }
};

Databases.prototype.removeAll = function removeAll() {
  Object.keys(this._databases).forEach(this.remove.bind(this));
};

Databases.prototype._reconnectTimeout = function _reconnectTimeout() {
  // TODO: make the following hard-coded values optionable
  var timeout = Math.min((this._lastTimeout || 100) * (1 + Math.random()), this._options.reconnectMaxTimeoutMS);
  this._lastTimeout = timeout;
  return timeout;
};
