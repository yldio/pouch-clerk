var debug = require('debug')('pouch-stream-multi-sync:test');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var before = lab.before;
var after = lab.after;
var it = lab.it;
var Code = require('code');
var expect = Code.expect;

var Doc = require('../lib/doc');

describe('Doc', function() {

  it('doesnt accept put for a different document id', function(done) {
    var doc = Doc(null, 'A');
    doc.put({_id: 'B'}, function(err) {
      expect(err.message).to.equal('trying to update another doc from a different updater');
      done();
    })
  });

  it('fails merge if db.get errors', function(done) {
    var db = {
      get: function(id, cb) {
        expect(id).to.equal('B');
        cb(new Error('oops'));
      }
    }
    var doc = Doc(db, 'B');
    doc.merge(function() {}, function(err) {
      expect(err.message).to.equal('oops');
      done();
    })
  });

  it('fails merge if db.put errors', function(done) {
    var db = {
      get: function(id, cb) {
        cb(null, {_id: id});
      },
      put: function(doc, cb) {
        cb(new Error('ouch'));
      }
    }
    var doc = Doc(db, 'B');
    doc.merge(function() {}, function(err) {
      expect(err.message).to.equal('ouch');
      done();
    })
  });

  it('it retries merge if db.put signals conflict', function(done) {
    var first = true;
    var db = {
      get: function(id, cb) {
        cb(null, {_id: id, a: 0});
      },
      put: function(doc, cb) {
        if (first) {
          first = false;
          var err = new Error('ouch');
          err.status = 409;
          cb(err);
        } else {
          cb(null, {id: doc._id, rev: 'rev'})
        }
      }
    }
    var doc = Doc(db, 'C');
    doc.merge(function(doc) {
      doc.a ++;
    }, function(err, doc) {
      expect(err).to.equal(null);
      expect(first).to.equal(false);
      expect(doc.a).to.equal(1);
      expect(doc._id).to.equal('C');
      expect(doc._rev).to.equal('rev');
      done();
    })
  });

});
