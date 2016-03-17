var debug = require('debug')('pouch-stream-multi-sync:test');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var before = lab.before;
var after = lab.after;
var it = lab.it;
var Code = require('code');
var expect = Code.expect;

var timers = require('timers');
var PouchDB = require('pouchdb');
var MemPouchDB = PouchDB.defaults({
  db: require('memdown'),
});

var Clerk = require('../');

describe('clerk', function() {
  var transitions = {};
  var clerk = new Clerk({
    transitions: transitions
  });
  var db = new MemPouchDB('db3');
  clerk.add(db);

  it('can handle some transitions', function(done) {
    transitions.state1 = function(doc, next) {
      next();
      done();
    }
    transitions.start = function(doc, next) {
      next(null, 'state1');
    }
    db.put({_id: 'id1'}, ensureNoError(done));
  });

  it('can remove database', function(done) {
    clerk.remove(db);
    done();
  });

  it('does not call handlers again when db added back', function(done) {
    transitions.start = transitions.state1 = fail;
    clerk.add(db);
    timers.setTimeout(function() {
      delete transitions.start;
      delete transitions.state1;
      done();
    }, 5e2);
  });

  it('if I let an operation not complete', function(done) {
    transitions.state1 = function(doc, next) {
      delete transitions.start;
      delete transitions.state1;
      done();
    }
    transitions.start = function(doc, next) {
      next(null, 'state1');
    }
    db.put({_id: 'id2'}, ensureNoError(done));
  });

  it('and if I remove the database', function(done) {
    clerk.remove(db);
    done();
  });

  it('I get the unhandled call', function(done) {
    transitions.state1 = function(doc, next) {
      delete transitions.state1;
      next();
      done();
    }
    clerk.add(db);
  });

});

function fail() {
  throw new Error('should not have been called');
}

function ensureNoError(done) {
  return function(err) {
    if (err) {
      done(err);
    }
  }
}