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
      this.stop(db, doc);
    } else {
      this.maybeStart(db, doc);
    }
  }

  maybeStart(realDB, realDoc) {
    const docHandler = this._maybeCreateDBDoc(realDB, realDoc._id);
    if (! docHandler.started) {
      docHandler.started = true;
      docHandler.start(Doc(realDB.db, realDoc._id));
    }
  }

  stop(realDB, realDoc) {
    const db = this._dbs[realDB.name];
    const docHandler = db && db[realDoc._id];
    if (docHandler) {
      docHandler.started = false;
      delete db[realDoc._id];
      /* istanbul ignore else */
      if (! Object.keys(db).length) {
        delete this._dbs[realDB.name];
      }
      docHandler.stop(Doc(realDB, realDoc._id));
    }
  }

  stopAll() {
    Object.keys(this._dbs).forEach(dbName => {
      const db = this._dbs[dbName];
      Object.keys(db).forEach(docId => {
        const docHandler = db[docId];
        if (docHandler.stop) {
          docHandler.stop(Doc(docHandler._realDB, docId));
        }
      });
    });
    this._dbs = {};
  }

  _maybeCreateDBDoc(realDb, docId) {
    let db = this._dbs[realDb.name];
    if (! db) {
      db = this._dbs[realDb.name] = {};
    }
    let doc = db[docId];
    if (! doc) {
      doc = db[docId] = Object.assign({}, this._options, {
        _realDB: realDb,
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
