var debug = require('debug')('pouch-stream-multi-sync:test');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var before = lab.before;
var after = lab.after;
var it = lab.it;
var Code = require('code');
var expect = Code.expect;

var PouchDB = require('pouchdb');
var MemPouchDB = PouchDB.defaults({
  db: require('memdown'),
});

var Clerk = require('../');

describe('clerk', function() {

  var clerk;
  var db;
  var lastSeq;

  it('can be created with no options', function(done) {
    var clerk = Clerk();
    expect(clerk).to.be.an.object();
    done();
  });

  it('can be created with options', function(done) {
    clerk = Clerk({
      initialState: 'start',
    });
    expect(clerk).to.be.an.object();
    done();
  });

  it('can be used to define document state transitions', function(done) {
    clerk.states.on('start', function(doc, callback) {
      doc.states = ['start'];
      callback(null, 'state a');
    });
    done();
  });

  it('can react to a database', function(done) {
    db = new MemPouchDB('db');
    clerk.reactTo(db);
    done();
  });

  it('reacts to a new document', function(done) {
    var expectations = [];
    expectations.push(
      function(doc) {
        expect(doc.a).to.equal(1);
        expect(doc.states).to.be.undefined();
      },
      function(doc) {
        expect(doc.states).to.deep.equal(['start']);
        expect(doc.clerk_state.state).to.equal('state a');
      }
    );

    var changes = db.changes({live: true, include_docs: true});
    changes.on('change', onChange);

    db.post({ a: 1 }, function(err) {
      expect(err).to.be.null();
    });

    function onChange(change) {
      lastSeq = change.seq;
      expectations.shift()(change.doc);
      if (! expectations.length) {
        changes.removeListener('change', onChange);
        changes.cancel();
        clerk.states.removeAllListeners();
        done();
      }
    }
  });

  it('accepts error as reaction', function(done) {
    var hadError = false;
    clerk.states.on('start', function(doc, callback) {
      callback(new Error('oops!'));
    });
    clerk.states.on('error', function(doc) {
      hadError = true;
    });

    var expectations = [];
    expectations.push(
      function(doc) {
        expect(doc.a).to.equal(2);
      },
      function(doc) {
        expect(doc.clerk_state).to.be.an.object();
        expect(doc.clerk_state.state).to.equal('error');
        expect(doc.clerk_state.lastError).to.be.an.object();
        expect(doc.clerk_state.lastError.message).to.equal('oops!');
        expect(doc.clerk_state.lastError.stack).to.be.a.string();
      }
    );

    var changes = db.changes({
      live: true,
      include_docs: true,
      since: lastSeq,
    });
    changes.on('change', onChange);

    db.post({ a: 2 }, function(err, doc) {
      expect(err).to.be.null();
    });

    function onChange(change) {
      lastSeq = change.seq;
      expectations.shift()(change.doc);
      if (! expectations.length) {
        expect(hadError).to.equal(true);
        changes.removeListener('change', onChange);
        changes.cancel();
        clerk.states.removeAllListeners();
        done();
      }
    }
  });

  it('doesnt allow to call back with same state as before', function(done) {
    clerk.once('error', function(err) {
      expect(err.message).to.equal('same state as previous: start');
      clerk.states.removeAllListeners();
      done();
    });

    clerk.states.on('start', function(doc, callback) {
      callback(null, 'start');
    });

    db.post({ a: 2 }, function(err, doc) {
      expect(err).to.be.null();
    });
  });

  it('doesnt allow two listeners for the same state');

  it('doesnt call action when the state in the change is not the latest');

  it('can be stopped', function(done) {
    clerk.stop();
    done();
  });

});
