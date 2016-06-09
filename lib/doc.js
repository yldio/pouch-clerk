'use strict';

module.exports = function createDoc(db, doc) {
  return new Doc(db, doc);
};

class Doc {

  constructor(db, doc) {
    this._db = db;
    this.id = doc._id;
  }

}
