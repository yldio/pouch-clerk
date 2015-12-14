# pouch-clerk

PouchDB worker reacting to document changes.

Each document has a state. A clerk listens to changes in one or more PouchDB databases and react to document state changes.

When reacting to a document state change, the clerk can:

* change the document
* say what the next state is going to be

## Install

```
$ npm install pouch-clerk --save
```

## Use

### Require package and create clerk:

```js
var Clerk = require('pouch-clerk');

var options = {
  initialState: 'created' // defaults to `start`
  reconnectMaxTimeoutMS: 3000 // defaults to 3000 ms
};

var clerk = Clerk(options);
```

### Define a clerk error handler:

```js
clerk.on('error', function(err) {
  console.log('clerk error:', err.message);
});
```

### Define an `error` state handler:

```js
clerk.states.on('error', function(doc, callback) {
  // you can recover a doc from error here
  console.log('document is on error state. Error:', doc.clerk_state.lastError);
});
```

### Define state entry handlers:

```js
// react to a document that entered the `created` state:
clerk.states.on('created', function(doc, callback) {
  // change document
  doc.counter = doc.counter + 1;

  // do something asynchronous:

  somethingAsynchronous(function(err, result) {
    if(err) {
      callback(err); // next document state is "error"
    } else {
      doc.result = result;

      // callback with the next state is:
      callback(null, 'resulted');
    }
  });
});

// react to a document that entered the `resulted` state:
clerk.states.on('resulted', function(doc, callback) {
  // etc...
});
```

### Clerk starts reacting to database changes:

```js
var PouchDB = require('pouchdb');
var db = new PouchDB('somedatabase');

clerk.reactTo(db);
```


### Stop clerk

```js
clerk.stop();
```


## Error handling

The clerk object will emit `error` events when there is an unrecoverable error when saving document changes.

# License

ISC
