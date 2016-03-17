var nock = require('nock');
var PouchDB = require('pouchdb');

nock('http://localhost:5984')
    .get('/mydb/')
    .reply(200, {
      db_name: 'mydb',
      doc_count: 1,
      doc_del_count: 0,
      update_seq: 1,
      purge_seq: 0,
      compact_running: false,
      disk_size: 4185,
      data_size: 198,
      instance_start_time: '1450192959683254',
      disk_format_version: 6,
      committed_update_seq: 1
    }, {
      server: 'CouchDB/1.6.1 (Erlang OTP/17)',
      date: 'Tue, 15 Dec 2015 15:26:19 GMT',
      'content-type': 'application/json',
      'content-length': '227',
      'cache-control': 'must-revalidate'
    })
    .get('/mydb/mydoc')
    .query({})
    .reply(200, {
      _id: 'mydoc',
      _rev: '1-967a00dff5e02add41819138abb3284d'
    }, {
      server: 'CouchDB/1.6.1 (Erlang OTP/17)',
      etag: '1-967a00dff5e02add41819138abb3284d',
      date: 'Tue, 15 Dec 2015 15:26:19 GMT',
      'content-type': 'application/json',
      'content-length': '60',
      'cache-control': 'must-revalidate'
    })

var db = new PouchDB('http://localhost:5984/mydb')
db.get('mydoc')
  .then(function () {
    console.log('ok')
  })

  .catch(function (error) {
    console.log('error')
    console.log(error)
  })