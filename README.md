# pifall

**`pifall`** is an implementation of `promisifyAll` in terms of Node 8's
included [`util.promisify`](https://nodejs.org/dist/latest-v8.x/docs/api/util.html#util_util_promisify_original).

That is, it will iterate over your object's properties, and make an
`Async`-suffixed copy of any functions it finds. If it runs into a getter, it
will create the `Async` version, which will grab the value from the getter, and
work as normal, if the value ends up being a function. Otherwise it will throw.

The `Async`-suffixed versions are as returned by `util.promisify`.

In the event that you already have a `foo` and a `fooAsync`, the `fooAsync` will
be overwritten. If it's not writable, or not configurable, `pifall` will make no
attempt to circumvent that.

Note that `pifall` operates **in-place** on the object. It does not return
anything, and the original object is augmented with the new methods.

### Usage

Example:
```
const obj = {
  func (cb) {
    setImmediate(() => {
      cb(null, 'hello');
    });
  }
}

require('pifall')(obj);

obj.funcAsync().then(result => console.assert(result === 'hello'));
```

### License

MIT License. See LICENSE.txt.
