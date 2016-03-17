module.exports = Handlers;

function Handlers(options) {
  if (! (this instanceof Handlers)) {
    return new Handlers(handlers);
  }

  this._options = options;
  this._handlers = options.handlers;
}

Handlers.prototype.handleChange = function handleChange(doc) {

  // decorate doc
  Object.setPrototypeOf(doc, Doc.prototype);

  if (! doc.clerk_state) {
    doc.clerk_state = {
      state: this._options.initialState,
    };
  }
  var state = doc.clerk_state.state;

  var handler = this._handlers[state];
  if (handler) {
    handler.call(doc);
  }
};
