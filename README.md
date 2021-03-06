# clone-comparison-nodejs

Everybody wants to clone the world. How right do they get it? This project aims to find out.

This project is a suite of tests run against a bunch of cloning libraries available on [npm](https://www.npmjs.com/), and attempts to gauge each library's capabilities and correctness, with respect to the data types available in Node.js.

The ideal characteristics of a Node.js cloning library are as follows:

- All data types can be cloned. This includes native data types, like Buffer, ArrayBuffer. (Immutable types, such as primitives like numbers and strings, do not need to be cloned.)
- All properties in the original are available on the clone. This includes "length", "size", and methods.
- Any data type can be passed in to the clone function, not just objects.
- Mutation of the original value, or the cloned value, does not affect the other.
- Prototype inheritance is preserved, including extending native types like Map.

Note, that if speed is a priority, you can check out [some benchmarks](https://github.com/ahmadnassri/benchmark-node-clone) to find a fast library, and combine it with these tests to choose a library based on the minimum required functionality for your use case.

## Results

The test results are available online here:

[https://laurence-myers.github.io/clone-comparison-nodejs/index.html](https://laurence-myers.github.io/clone-comparison-nodejs/index.html)

## Libraries tested

- clone
- clone-deep
- clone-extend
- component-clone
- deep-clone
- deep-copy
- deepclone
- deepcopy
- extend
- fast-clone
- fast-deepclone
- lodash.clonedeep
- stringify-clone
- structured-clone
- utils-copy

## Development

- [Install yarn](https://yarnpkg.com/en/docs/install)
- `yarn install`
- `yarn run build`

### Adding a new library to test

- `yarn add brand-spanking-new-clone-lib --exact`
- Add a new file to the test directory, named like `brand-spanking-new-clone-libTest`.
- In that file, import `testCloneLibrary()` from `core.ts`, and invoke it with the name of the module.
- Update the list of tested libraries in `README.md`.
- Generate the new report file using `yarn run test-report`, commit it to Git, and submit a Pull Request.

## TODO

- Test more data types:
  - Error
  - Function
  - Promise
  - Proxy
  - Symbol
  - WeakMap
  - WeakSet
  - Data types implemented in Node.js native code extensions (like maybe fs.Stats)
- Test cloning Object, Number, and String instances, and make sure they do not get converted to primitives.
- Test cloning all possible Number values, including negatives, inifinities, scientific notation, and NaNs.
