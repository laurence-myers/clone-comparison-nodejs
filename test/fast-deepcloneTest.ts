import { testCloneLibrary } from "./core";
import * as assert from "assert";

const cloneLib = require('fast-deepclone');
const cloner = <T>(obj : T) => cloneLib(obj, true);
testCloneLibrary(`fast-deepclone`, {
    cloner,
    testSuiteOverrides: {
        ArrayBuffer: () => {
            it(`can deep copy an ArrayBuffer contained in an object property`, function () {
                assert.fail(`fast-deepclone fails to clone ArrayBuffers, throwing a fatal error:

#
# Fatal error in heap\\heap.cc, line 3641
# Check failed: map->instance_type() == JS_REGEXP_TYPE || map->instance_type() == JS_OBJECT_TYPE || map->instance_type() == JS_ERROR_TYPE || map->instance_type() == JS_ARRAY_TYPE || map->instance_type() == JS_API_OBJECT_TYPE || map->instance_type() == WASM_INSTANCE_TYPE || map->instance_type() == WASM_MEMORY_TYPE || map->instance_type() == WASM_MODULE_TYPE || map->instance_type() == WASM_TABLE_TYPE || map->instance_type() == JS_SPECIAL_API_OBJECT_TYPE.
#

Refer to https://github.com/scottinet/fast-deepclone/issues/5`);
            });
        }
    }
});
