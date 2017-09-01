'use strict';

const pitesti = require('pitesti');
const assert = require('assert');
const pifall = require('./index');

const obj = {
  x: 1,
  y: 2,
  foo: cb => setImmediate(() => {cb(null, 'hello')}),
  get bar() {
    return cb => setImmediate(() => {cb(null, 'barbar')})
  },
  get baz() {
    return 5;
  },
};

pifall(obj);

const test = pitesti();

test`non-funcs aren't processed`(() => {
  assert(!('xAsync' in obj));
  assert(!('yAsync' in obj));
});

test`normal func`(() => obj.fooAsync().then(result => {
  assert.equal(result, 'hello');
}));

test`getter func`(() => obj.barAsync().then(result => {
  assert.equal(result, 'barbar');
}));

test`non-func getter`(() => {
  assert.throws(() => {
    obj.bazAsync();
  }, /^TypeError: called Async suffix on non-function getter$/);
});

test();
