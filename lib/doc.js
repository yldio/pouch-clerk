'use strict';

module.exports = function createDoc(db, docId) {
  return new Doc(db, docId);
};

class Doc {

  constructor(db, docId) {
    this._db = db;
    this.id = this._id = docId;
  }

  get(cb) {
    this._db.get(this.id, cb);
  }

  put(doc, cb) {
    if (doc._id && doc._id !== this.id) {
      cb(new Error('trying to update another doc from a different updater'));
    } else {
      this._db.put(doc, cb);
    }
  }

}
