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

var Databases = require('../lib/databases');

describe('databases', function() {

  var databases = new Databases();
  var db;

  it('can add a database', function(done) {
    db = new MemPouchDB('db1');
    databases.add(db);
    done();
  });

  it('starts listening to changes on added db', function(done) {
    databases.once('change', function(change) {
      expect(change._id).to.equal('A');
      expect(change.a).to.equal(1);
      done();
    });

    db.put({_id: 'A', a: 1});
  });

  it('can remove db by name', function(done) {
    databases.remove('db1');
    done();
  });

  it('stops listening to changes if you remove db', function(done) {
    databases.once('change', function() {
      expect.fail('should not have emitted this change');
    });
    db.put({_id: 'B', b: 2});
    timers.setTimeout(done, 5e2);
  });

});
