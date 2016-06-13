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
        clerk.stop(done);
      },
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
            clerk.stop(done);
          }, 100);
        })
      }, 100);
    });
  });

  it('finishes updater when final state is reached', function(done) {
    var asyncUpdater = {
      start: function() {},
      stop: function(doc) {
        expect(doc.id).to.equal('C');
        clerk.stop(done);
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

  it('doesn\'t finish if hasn\'t started', function(done) {
    var asyncUpdater = {
      start: function() {},
      stop: function(doc) {
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
      clerk.stop(done);
    }, 200);
  });

  it('can get and update documents', function(done) {
    var stopped = false;
    var asyncUpdater = {
      start: function(doc) {
        this._interval = setInterval(function() {
          doc.get(function(err, latestDoc) {
            if (err) throw err;
            latestDoc.a ++;
            doc.put(latestDoc, function(err) {
              if (err) throw err;
            })
          });
        }, 50);
      },
      stop: function(doc) {
        stopped = true;
        clearInterval(this._interval);
      },
    };

    var clerk = new Clerk({
      asyncUpdaters: asyncUpdater
    });
    const db = new MemPouchDB('async-updates-test-db-4');

    clerk.add(db);
    db.put({_id: 'D', clerk_state: {state: 'start'}, a: 0}, function(err) {
      if (err) throw err;
    });
    setTimeout(function() {
      clerk.stop(function() {
        expect(stopped).to.equal(true);
        db.get('D', function(err, doc) {
          if (err) throw err;
          expect(doc.a).to.equal(9);
          clerk.stop(done);
        })
      });
    }, 500);
  });

  it('can merge a document', function(done) {
    var stopped = false;
    var asyncUpdater = {
      start: function(doc) {
        this._interval = setInterval(function() {
          doc.merge(function(doc) {
            doc.a ++;
          });
        }, 50);
      },
      stop: function(doc) {
        stopped = true;
        clearInterval(this._interval);
      },
    };

    var clerk = new Clerk({
      asyncUpdaters: asyncUpdater
    });
    const db = new MemPouchDB('async-updates-test-db-4');

    clerk.add(db);
    db.put({_id: 'E', clerk_state: {state: 'start'}, a: 0}, function(err) {
      if (err) throw err;
    });
    setTimeout(function() {
      clerk.stop(function() {
        expect(stopped).to.equal(true);
        db.get('E', function(err, doc) {
          if (err) throw err;
          expect(doc.a).to.equal(9);
          clerk.stop(done);
        });
      });
    }, 500);
  });

});
