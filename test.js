'use strict';

const pitesti = require('pitesti');
const assert = require('assert');
const pifall = require('./index');

const obj = {
  x: 1,
  y: 2,
  foo: cb => setImmediate(() => { cb(null, 'hello'); }),
  get bar () {
    return cb => setImmediate(() => { cb(null, 'barbar'); });
  },
  get baz () {
    return 5;
  },
  set bop (x) { // eslint-disable-line accessor-pairs
    // When iterating over this, we should get nothing.
  },
  [Symbol('bonk')] () {
    // noop
  }
};

const objWithProto = {
  __proto__: {
    foo: cb => setImmediate(() => { cb(null, 'hello'); })
  }
};

const returnedObj = pifall(obj);
pifall(objWithProto, { proto: true });

const test = pitesti();

test`returns the input object`(() => {
  assert.strictEqual(returnedObj, obj);
});

test`non-funcs aren't processed`(() => {
  assert(!('xAsync' in obj));
  assert(!('yAsync' in obj));
});

test`normal func`(() => obj.fooAsync().then(result => {
  assert.strictEqual(result, 'hello');
}));

test`setter`(() => {
  assert(!Reflect.getOwnPropertyDescriptor(obj, 'bopAsync'));
});

test`getter func`(() => obj.barAsync().then(result => {
  assert.strictEqual(result, 'barbar');
}));

test`non-func getter`(() => {
  assert.throws(() => {
    obj.bazAsync();
  }, /^TypeError: called Async suffix on non-function getter$/);
});

test`object has correct number of properties`(() => {
  // also tests that symbol was ignored
  assert.strictEqual(Reflect.ownKeys(obj).length, 10);
});

test`prototype is promisified`(() => objWithProto.fooAsync().then(result => {
  assert.strictEqual(result, 'hello');
}));

test`non-obj/func fails to be promisified`(() => {
  [
    null,
    5,
    true,
    'hello',
    Symbol('bonk')
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

test`class is promisified`(() => {
  class Foo {
    bar (cb) {
      setImmediate(() => { cb(null, 'barbar'); });
    }
  }
  class Foo2 {
    bar (cb) {
      setImmediate(() => { cb(null, 'barbar'); });
    }
  }

  const obj = { Foo };
  pifall(obj);
  assert.strictEqual(typeof obj.FooAsync, 'function');
  assert.notStrictEqual(typeof obj.Foo.prototype.barAsync, 'function');
  const anotherObj = { Foo: Foo2 };
  pifall(anotherObj, { classes: true });
  assert.notStrictEqual(typeof anotherObj.FooAsync, 'function');
  assert.strictEqual(typeof anotherObj.Foo.prototype.barAsync, 'function');
  const f = new anotherObj.Foo();
  return f.barAsync().then(result => {
    assert.strictEqual(result, 'barbar');
  });
});

test`different suffix`(() => {
  const aObj = {
    foo: cb => setImmediate(() => { cb(null, 'hello'); })
  };
  pifall(aObj, { suffix: 'Asink' });
  return aObj.fooAsink().then(result => {
    assert.strictEqual(result, 'hello');
  });
});

test`custom promisifier`(() => {
  let called = false;
  const promisifier = (func) => {
    return (...args) => {
      called = true;
      return new Promise((resolve, reject) => {
        func(...args, (err, out) => {
          if (err) {
            reject(err);
          } else {
            resolve(out);
          }
        });
      });
    };
  };
  const aObj = {
    foo: cb => setImmediate(() => { cb(null, 'hello'); })
  };
  pifall(aObj, { promisifier });
  return aObj.fooAsync().then(result => {
    assert.strictEqual(result, 'hello');
    assert.strictEqual(called, true);
  });
});

test();
