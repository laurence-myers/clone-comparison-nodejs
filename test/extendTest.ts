import { testCloneLibrary } from "./core";

const cloneLib = require('extend');
const cloner = <T>(obj : T) => {
    const dest = {};
    cloneLib(true, dest, obj);
    return dest as any as T;
};

testCloneLibrary(`extend`, {
    cloner
});
