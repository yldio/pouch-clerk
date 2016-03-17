
module.exports = Doc;

Doc.prototype.setDB function setDB(db) {

};

Doc.prototype.next = function next(newState) {
  var err = _err;
  debug('clerk advanced to new state %j', newState);
  if (! err && newState && state === newState) {
    debug('new state is the same as previous');
    err = new Error('same state as previous: ' + newState);
    clerk.emit('error', err);
  } else if (err) {
    clerk._onDocError(database, doc, err);
  } else if (newState) {
    debug('saving new doc state: %s', newState);
    doc.clerk_state = extend(doc.clerk_state, {
      state: newState,
      when: new Date(),
    });
    clerk._saveDoc(database, doc);
  }
}
