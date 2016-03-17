var debug = require('debug')('pouch-stream-multi-sync:test');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var before = lab.before;
var after = lab.after;
var it = lab.it;
var Code = require('code');
var expect = Code.expect;

var once = require('once');
var timers = require('timers');
var PouchDB = require('pouchdb');
var MemPouchDB = PouchDB.defaults({
  db: require('memdown'),
});

var Databases = require('../lib/databases');

describe('databases', function() {

  var databases = new Databases();
  var db = new MemPouchDB('databases-errors');
  var changes;

  var oldChanges = db.changes;
  db.changes = function() {
    changes = oldChanges.apply(db, arguments);
    db.changes = oldChanges;
    return changes;
  }

  databases.add(db);

  it('starts listening again after changes errors', function(_done) {
    done = once(_done);
    db.changes = function() {
      changes = oldChanges.apply(db, arguments);
      db.changes = oldChanges;
      databases.remove(db);
      done();
      return changes;
    };
    changes.emit('error', new Error('ouch'));
  });
});
