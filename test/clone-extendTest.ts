import { testCloneLibrary } from "./core";

const cloneLib = require('clone-extend');
const cloner = <T>(obj : T) => {
    const dest = {};
    cloneLib(obj, dest);
    return dest as any as T;
};

testCloneLibrary(`clone-extend`, {
    cloner
});
