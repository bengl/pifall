'use strict';

const { promisify } = require('util');

// As a bit of a safety net, don't promisifyAll any built-in prototypes.
const builtInPrototypes = Reflect.ownKeys(global).map(k => {
  if (k === 'GLOBAL' || k === 'root') {
    // avoid deprecation warnings
    return false;
  }
  const obj = global[k];
  if (
    typeof k === 'string' &&
    typeof obj === 'function' &&
    k.toUpperCase()[0] === k[0]
  ) {
    return obj.prototype;
  } else {
    return false;
  }
}).filter(x => !!x);

function promisifyAll(obj, options = {}) {
  if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
    throw new TypeError('Cannot pifall non-object');
  }
  if (builtInPrototypes.includes(obj)) {
    throw new TypeError('Cannot pifall built-in prototype');
  }
  const keys = Reflect.ownKeys(obj);
  for (const k of keys) {
    if (typeof k === 'symbol') {
      // Symbols are ignored, since referring to them by name isn't a thing.
      // We could grab the string and make a new symbol whose name has the
      // suffix, but that doesn't make a whole lot of sense unless you iterate
      // over the object later to find the Symbols. It doesn't seem realistic.
      continue;
    }
    const desc = Reflect.getOwnPropertyDescriptor(obj, k);
    const fn = desc.value;
    if (fn) {
      // Yay! It's a normal property. No shenanigans. Just assign it.
      if (typeof fn === 'function') {
        obj[k + 'Async'] = promisify(fn);
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
        Reflect.defineProperty(obj, k + 'Async', Object.assign({}, desc, {
          get () {
            const result = desc.get.apply(this);
            if (typeof result === 'function') {
              return promisify(result);
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
      (typeof proto === 'object' || typeof proto === 'function') &&
      !builtInPrototypes.includes(proto)
    ) {
      promisifyAll(proto, options);
    }
  }
}

module.exports = promisifyAll;
