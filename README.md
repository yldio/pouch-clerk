# pouch-clerk

[![Build Status](https://travis-ci.org/pgte/pouch-clerk.svg?branch=master)](https://travis-ci.org/pgte/pouch-clerk)

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

var transitions = {
  // document defining state transition handlers
};

var options = {
  initialState: 'start', // defaults to `start`
  finalState: 'finished', // defaults to `finish`
  reconnectMaxTimeoutMS: 3000, // defaults to 3000 ms
  transitions: transitions,
};

var clerk = Clerk(options);
```

### Options

* `initialState` (string): the state to give new documents with no state yet
* `finalState` (string or string array): the end state (or states, if you pass an array)
* `reconnectMaxTimeoutMS` (number): the maximum number of miliseconds to wait before trying to (re)connect
* `transitions` (object): the state transition handlers. Object where the keys are the state names and the values are functions.
* `asyncUpdaters`: an array of functions that start and stop async updaters. See [Async Updaters section](#async-updaters).

### The state transition handlers

The `options.transitions` should contain an object with a key for each state.
The value for each state should be a handler function, like this:

```js
var transitions = {
  'start': function(doc, next) {
    // ...
  }
}
```

Example:

```javascript
var transitions = {
  'start': function(doc, next) {
    somethingAsynchronous(function(err, result) {
      if (err) {
        doc.error(err);
      } else {
        doc.result = result;
        next(null, 'waiting for driver'); // jump into next state
      }
    });
  },

  'waiting for driver': function(doc, next) {
    // ...
  }
```

## Reentering the same state

You can force reentry on the same state (watch out for infinite loops), by passing a `true` as third argument to the `next` callback:

```js
var transitions = {
  'waiting for driver': function(doc, next) {
    next(null, 'waiting for driver', true);
  }
}
```

## Adding and removing databases

A clerk can react to one or more databases. During runtime you just add or remove a database:

```js
var PouchDB = require('pouchdb');
var db = new PouchDB('somedatabase');

clerk.add(db);
```

```js
clerk.remove(db);
```

#### Name databases

You can also remove by database name:

```js
clerk.add(db, 'mydb');
clerk.remove('mydb');
```

You can also find out if a named database exists:

```js
if (!clerk.has('mydb')) {
  clerk.add(db, 'mydb');
}
```

## Async updaters

You can push async updates into documents like this:

```javascript
var asyncUpdater = {
  start: function(doc) {
    this._interval = setInterval(function() {
      doc.merge(function(currentDoc) {
        currentDoc.counter = currentDoc.counter + 1;
      })
    }, 1000);
  },
  stop: function() {
    clearInterval(this._interval);
  }  
}

var options = {
  asyncUpdaters: [asyncUpdater]  
};

var clerk = Clerk(options);
```

(Each document creates an async updater instance, which you can reference by `this` inside the `start` or `stop` methods).

### Async updater API

The Async Updater `start` method gets a `doc` instance for each document that is being handled. Using this document you can:

#### get the ID of the document

```js
function start(doc) {
  console.log(doc._id);
}
```

#### get the latest document version:

```js
function start(doc) {
  doc.get(function(err, latestDoc) {
    // ...
  })
}
```

#### update the document:

```js
function start(doc) {
  doc.put(doc, function(err) {

  });
}
```


#### merge some attributes into the latest version of the document:

```js
function start(doc) {
  doc.merge(function(latest) {
    latest.counter ++;
  }, function(err) {
    // handle err
  });
}
```

## Error handling

The error handling strategy depends on the type of error happening.

### User-land errors

If an error occurs while you're processing a state transition, you should call the `next` callback with that error as the first argument:


```javascript
var transitions = {
  'waiting for driver': function(doc, next) {
    somethingAsynchronous(function(err) {
      if (err) return next(err);
      /// ...
    });
  }
};
```

This will make the document transition into the `error` state.

> You should define an error state handler (if you don't that error will be handled as an internal error — see the next section about internal errors).

```javascript
var transitions = {
  'error': function(err, doc, next) {
    // you can recover from error:
    next(null, 'some next state');
  }
}
```

### Internal errors

Internal errors can occurr when saving document changes. You can listen for those errors on the clerk object:

```javascript
clerk.on('error', function(err) {
  
});
```

(if you don't, an uncaught exception will be thrown);


### Stop clerk

```js
clerk.stop(callback);
```

# License

ISC
