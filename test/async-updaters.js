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

describe('async updater', function() {

  it('starts when a new doc is found', function(done) {
    var asyncUpdater = {
      start: function(doc) {
        expect(doc.id).to.equal('A');
        done();
      },
      finish() {}
    };

    var clerk = new Clerk({
      asyncUpdaters: [asyncUpdater]
    });
    const db = new MemPouchDB('async-updates-test-db-1');
    clerk.add(db);
    db.put({_id: 'A'})
  });

  it('doesnt start again when the same doc is found', function(done) {
    var startCount = 0;

    var asyncUpdater = {
      start: function(doc) {
        startCount ++;
      },
      finish() {},
    };

    var clerk = new Clerk({
      asyncUpdaters: [asyncUpdater],
      finalState: ['finished'],
    });
    const db = new MemPouchDB('async-updates-test-db-2');
    clerk.add(db);
    db.put({_id: 'B'}, function(err, reply) {
      if (err) throw err;
      setTimeout(function() {
        db.put({_id: 'B', _rev: reply.rev}, function(err) {
          if (err) throw err;
          setTimeout(function() {
            expect(startCount).to.equal(1);
            done();
          }, 100);
        })
      }, 100);
    });
  });

  it('finishes updater when final state is reached', function(done) {
    var asyncUpdater = {
      start: function() {},
      finish: function(doc) {
        expect(doc.id).to.equal('C');
        done();
      }
    };

    var clerk = new Clerk({
      asyncUpdaters: [asyncUpdater]
    });
    const db = new MemPouchDB('async-updates-test-db-3');
    clerk.add(db);
    db.put({_id: 'C', clerk_state: {state: 'start'}}, function(err, res) {
      if (err) throw err;

      setTimeout(function() {
        db.put({_id: 'C', _rev: res.rev, clerk_state: {state: 'finished'}});
      }, 100);
    });
  });

  it('doesnt finish if hasn\'t started', function(done) {
    var asyncUpdater = {
      start: function() {},
      finish: function(doc) {
        throw new Error('should not finish');
      },
    };

    var clerk = new Clerk({
      asyncUpdaters: asyncUpdater
    });
    const db = new MemPouchDB('async-updates-test-db-4');

    clerk.add(db);
    db.put({_id: 'C', clerk_state: {state: 'finished'}}, function(err) {
      if (err) throw err;
    });
    setTimeout(function() {
      done();
    }, 200);
  })
});
