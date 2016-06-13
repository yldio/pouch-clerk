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

  merge(fn, cb) {
    this.get((err, doc) => {
      if (err) {
        cb(err);
      } else {
        fn.call(null, doc);
        this.put(doc, (err2, ret) => {
          if (err2 && err2.status === 409) {
            this.merge(fn, cb);
          } else if (cb) {
            if (ret) {
              doc._id = ret.id;
              doc._rev = ret.rev;
            }
            cb(err2, doc);
          }
        });
      }
    });
  }
}
