'use strict';

const promisify = require('util.promisify');
// eslint-disable-next-line valid-typeof
const is = ([type]) => x => typeof x === type;
const isObjectish = obj => is`object`(obj) || is`function`(obj);

// As a bit of a safety net, don't promisifyAll any built-in prototypes.
const builtInPrototypes = Reflect.ownKeys(global).map(k => {
  if (k === 'GLOBAL' || k === 'root') {
    // avoid deprecation warnings
    return false;
  }
  const obj = global[k];
  if (
    is`string`(k) &&
    is`function`(obj) &&
    k.toUpperCase()[0] === k[0]
  ) {
    return obj.prototype;
  } else {
    return false;
  }
}).filter(x => !!x);

function maybePromisifyClass (fn, options) {
  // We'd use k instead of fn.name, but it's simpler to use fn.name
  if (
    options.classes &&
    fn.name && // sometimes it's namelss!
    fn.name[0] === fn.name[0].toUpperCase() && // upper-case first character
    fn.prototype && // has a truthy prototype
    isObjectish(fn.prototype) // no bizarre prototypes
  ) {
    promisifyAll(fn.prototype);
    // won't promisify the function itself, because it's a class
    return true; // tell the caller we don't need to make a suffix copy
  }
}

function promisifyAll (obj, options = {}) {
  if (!obj || (!isObjectish(obj))) {
    throw new TypeError('Cannot pifall non-object');
  }
  if (builtInPrototypes.includes(obj)) {
    throw new TypeError('Cannot pifall built-in prototype');
  }
  const suffix = options.suffix || 'Async';
  const promisifier = options.promisifier || promisify;
  const keys = Reflect.ownKeys(obj);
  for (const k of keys) {
    if (is`symbol`(k)) {
      // Symbols are ignored, since referring to them by name isn't a thing.
      // We could grab the string and make a new symbol whose name has the
      // suffix, but that doesn't make a whole lot of sense unless you iterate
      // over the object later to find the Symbols. It doesn't seem realistic.
      continue;
    }
    const desc = Reflect.getOwnPropertyDescriptor(obj, k);
    const fn = desc.value;
    if (fn) {
      if (is`function`(fn)) {
        // If it's a class, promisify its prototype.
        if (!maybePromisifyClass(fn, options)) {
          // It's a normal function property. No shenanigans. Just assign it.
          obj[k + suffix] = promisifier(fn);
        }
      }
    } else {
      // Accessors.
      if (desc.get) { // If there's no getter, there's nothing we can do.
        // If it has a getter, it could return anything! We have no idea. The
        // best we can do is check whether it's a function after we've already
        // gotten the property. If it's not, the user is doing something really
        // horribly wrong, so we'll throw.
        //
        // We're setting the new descriptor to be the same as the old, but with
        // our own getter. This maintains writable, etc.
        Reflect.defineProperty(obj, k + suffix, Object.assign({}, desc, {
          get () {
            const result = desc.get.apply(this);
            if (is`function`(result)) {
              return promisifier(result);
            } else {
              throw new TypeError('called Async suffix on non-function getter');
            }
          }
        }));
      }
    }
  }
  if (options.proto) {
    const proto = Reflect.getPrototypeOf(obj);
    if (
      proto &&
      isObjectish(proto) &&
      !builtInPrototypes.includes(proto)
    ) {
      promisifyAll(proto, options);
    }
  }
  return obj;
}

module.exports = promisifyAll;
