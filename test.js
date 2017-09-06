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

const objWithProto = {
  __proto__: {
    foo: cb => setImmediate(() => {cb(null, 'hello')})
  }
};

pifall(obj);
pifall(objWithProto, { proto: true });

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

test`prototype is promisified`(() => objWithProto.fooAsync().then(result => {
  assert.equal(result, 'hello');
}));

test`non-obj/func fails to be promisified`(() => {
  [
    null,
    5,
    true,
    'hello',
    Symbol()
  ].forEach(obj => {
    assert.throws(() => pifall(obj),
      /^TypeError: Cannot pifall non-object$/);
  });

});

Reflect.ownKeys(global).filter(k =>
  typeof k === 'string' &&
  k !== 'Proxy' && // ugh special case
  k !== 'GLOBAL' && // deprecation
  k !== 'root' && // deprecation
  k.toUpperCase()[0] === k[0] &&
  typeof global[k] === 'function'
).forEach(k => {
  test`don't promisify built-in ${k}.prototype`(() => {
    assert.throws(() => pifall(global[k].prototype),
      /^TypeError: Cannot pifall built-in prototype$/);
  });
});

test();
