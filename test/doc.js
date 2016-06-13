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
});
