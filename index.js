'use strict';

const { promisify } = require('util');

function promisifyAll(obj) {
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
}

module.exports = promisifyAll;
