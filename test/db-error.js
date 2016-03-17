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

describe('clerk handles db errors', function() {
  var transitions = {};
  var clerk = new Clerk({
    transitions: transitions
  });
  var db = new MemPouchDB('db4');
  clerk.add(db);

  it('can handle some transitions', function(done) {
    clerk.once('error', function(err) {
      expect(err.message).to.equal('oops!');
      done();
    });
    transitions.start = function(doc, next) {
      db.put = function put(doc, cb) {
        process.nextTick(function() {
          cb(new Error('oops!'));
        });
      };

      next(null, 'state1');
    }
    db.put({_id: 'id1'}, ensureNoError(done));
  });


  it('can be stopped', function(done) {
    clerk.stop(done);
  });
});

function ensureNoError(done) {
  return function(err) {
    if (err) {
      done(err);
    }
  }
}