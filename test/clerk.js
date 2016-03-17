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
  var clerk;
  var db;
  var transitions = {};

  it('can be created', function(done) {
    clerk = new Clerk({
      transitions: transitions
    });
    done();
  });

  it('can add new database', function(done) {
    db = new MemPouchDB('db2');
    clerk.add(db);
    done();
  });

  it('can handle fresh document', function(done) {
    transitions.start = function(doc, next) {
      expect(doc._id).to.equal('id1');
      expect(doc.beep).to.equal('boop');
      delete transitions.start;
      next();
      done();
    };
    db.put({_id: 'id1', beep: 'boop'}, ensureNoError);
  });

  it('can handle a state transition', function(done) {
    transitions.state2 = function(doc, next) {
      expect(doc.boop).to.equal('beep');
      delete transitions.start;
      delete transitions.state2;
      next();
      done();
    }
    transitions.start = function(doc, next) {
      doc.boop = 'beep';
      next(null, 'state2');
    };
    db.put({_id: 'id2', beep: 'boop'}, ensureNoError);
  });

  it('can handle a failed handler, emitting globally', function(done) {
    clerk.once('error', function(err) {
      expect(err.message).to.equal('Unhandled user error: ouch');
      delete transitions.start;
      done();
    });
    transitions.start = function(doc, next) {
      next(new Error('ouch'));
    };
    db.put({_id: 'id3', beep: 'boop'}, ensureNoError);
  });

  it('can handle a failed handler, activating error handler', function(done) {
    transitions.recovered = function(doc, next) {
      delete transitions.start;
      delete transitions.error;
      delete transitions.recovered;
      next();
      done();
    }
    transitions.error = function(err, doc, next) {
      expect(err.message).to.equal('ouch');
      expect(err.when).to.be.a.string();
      expect(doc.beep).to.equal('boop');
      next(null, 'recovered');
    };
    transitions.start = function(doc, next) {
      next(new Error('ouch'));
    };
    db.put({_id: 'id4', beep: 'boop'});
  });

  it('can be stopped', function(done) {
    clerk.stop(done);
  });
});


function ensureNoError(err) {
  if (err) {
    throw err;
  }
}