'use strict';

const Doc = require('./doc');

module.exports = function createAsyncUpdater(options) {
  return new AsyncUpdater(options);
};

class AsyncUpdater {

  constructor(options) {
    this._options = options;
    this._dbs = {};
  }

  change(db, doc) {
    if (this._isDocInFinalState(doc)) {
      this.finish(db, doc);
    } else {
      this.maybeStart(db, doc);
    }
  }

  maybeStart(realDB, realDoc) {
    const doc = this._maybeCreateDBDoc(realDB.name, realDoc._id);
    if (! doc.started) {
      doc.started = true;
      doc.start(Doc(realDB, realDoc));
    }
  }

  finish(realDB, realDoc) {
    const db = this._dbs[realDB.name];
    const doc = db && db[realDoc._id];
    if (doc) {
      doc.started = false;
      delete db[realDoc._id];
      /* istanbul ignore else */
      if (! Object.keys(db).length) {
        delete this._dbs[realDB.name];
      }
      doc.finish(Doc(realDB, realDoc));
    }
  }

  _maybeCreateDBDoc(dbName, docId) {
    let db = this._dbs[dbName];
    if (! db) {
      db = this._dbs[dbName] = {};
    }
    let doc = db[docId];
    if (! doc) {
      doc = db[docId] = Object.assign({}, this._options, {
        started: false,
      });
    }
    return doc;
  }

  _isDocInFinalState(doc) {
    return (
      doc.clerk_state &&
      this._options.finalStates.indexOf(doc.clerk_state.state) >= 0);
  }
}


