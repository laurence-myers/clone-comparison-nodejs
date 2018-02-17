import * as assert from 'assert';

export type Cloner = <T>(obj : T) => T;

function wrapInObject<T>(value : T) : { myProperty : T } {
    return {
        myProperty : value
    };
}

function testGenericClone<T>(cloner : Cloner, typeName : string, valueToClone : T) : T {
    const clonedValue = cloner(valueToClone);
    assert.notStrictEqual(clonedValue, valueToClone, `The cloned ${ typeName } should not reference the same object in memory`);
    return clonedValue;
}

function testGenericPropertyClone<T>(cloner : Cloner, typeName : string, valueToClone : T) : T {
    const obj = wrapInObject(valueToClone);

    const clonedObjectValue = cloner(obj);
    assert.notStrictEqual(obj, clonedObjectValue, `The cloned object should not reference the same object in memory`);
    assert.notStrictEqual(clonedObjectValue.myProperty, undefined, `The cloned object should have a property called "myProperty"`);
    const clonedPropertyValue = clonedObjectValue.myProperty;
    assert.notStrictEqual(valueToClone, clonedPropertyValue, `The cloned ${ typeName } should not reference the same object in memory`);
    return clonedPropertyValue;
}

export interface TestSuiteOverrides {
    ArrayBuffer? : () => void;
}

export interface CloneLibraryOptions {
    cloner? : Cloner;
    testSuiteOverrides? : TestSuiteOverrides;
}

export function testCloneLibrary(libraryName : string, cloneLibraryOptions : CloneLibraryOptions = {}) {
    let cloner : Cloner;
    if (cloneLibraryOptions.cloner) {
        cloner = cloneLibraryOptions.cloner;
    } else {
        const cloneLib = require('deep-clone');
        cloner = <T>(obj : T) => cloneLib(obj);
    }
    const testSuiteOverrides : TestSuiteOverrides = cloneLibraryOptions.testSuiteOverrides || {};
    describe(libraryName, function () {
        let typeName : string;

        typeName = `Array`;
        describe(typeName, function () {
            const valueToClone = [{ myProperty: 1 }];

            it(`can deep copy a ${ typeName }`, function () {
                const clonedValue = testGenericClone(cloner, typeName, valueToClone);
                assert.notStrictEqual(clonedValue[0], valueToClone[0], `Array object values should not reference the same object in memory`);
            });

            it(`can deep copy a ${ typeName } contained in an object property`, function () {
                const clonedValue = testGenericPropertyClone(cloner, typeName, valueToClone);
                assert.strictEqual(clonedValue.length, valueToClone.length, `Cloned Arrays must keep the same length`);
                assert.notStrictEqual(clonedValue[0], valueToClone[0], `Array object values should not reference the same object in memory`);
            });

            it(`mutating an Array does not alter the clone`, function () {
                const originalValue = [123];
                const clonedValue = cloner(wrapInObject(originalValue)).myProperty;
                originalValue.push(456);
                assert.notStrictEqual(clonedValue.length, originalValue.length, `Mutated Arrays must have different lengths`);
                assert.notDeepEqual(originalValue, clonedValue, `Mutated Arrays must have different contents`);
            });
        });

        typeName = `ArrayBuffer`;
        describe(typeName, testSuiteOverrides.ArrayBuffer || function () {
            const valueToClone = new ArrayBuffer(3);
            const originalDataView = new DataView(valueToClone);
            originalDataView.setInt8(0, 1);
            originalDataView.setInt8(1, 2);
            originalDataView.setInt8(2, 3);

            it(`can deep copy a ${ typeName }`, function () {
                const clonedValue = testGenericClone(cloner, typeName, valueToClone);
                assert.doesNotThrow(() => new DataView(clonedValue), `Cloned ArrayBuffers can be passed to the DataView constructor without throwing a TypeError`);
                const cloneDataView = new DataView(clonedValue);
                assert.strictEqual(originalDataView.byteLength, cloneDataView.byteLength, `Cloned ArrayBuffers must keep the same length`);
                assert.strictEqual(originalDataView.getInt8(0), originalDataView.getInt8(0), `Cloned ArrayBuffers values must remain the same`);
            });

            it(`can deep copy a ${ typeName } contained in an object property`, function () {
                let clonedValue : ArrayBuffer;
                assert.doesNotThrow(() => {
                    clonedValue = testGenericPropertyClone(cloner, typeName, valueToClone);
                });
                assert.doesNotThrow(() => new DataView(clonedValue), `Cloned ArrayBuffers can be passed to the DataView constructor without throwing a TypeError`);
                const cloneDataView = new DataView(clonedValue!);
                assert.strictEqual(originalDataView.byteLength, cloneDataView.byteLength, `Cloned ArrayBuffers must keep the same length`);
                assert.strictEqual(originalDataView.getInt8(0), originalDataView.getInt8(0), `Cloned ArrayBuffers values must remain the same`);
            });
            //
            // it(`mutating an Array does not alter the clone`, function () {
            //     const originalValue = [123];
            //     const clonedValue = cloner(wrapInObject(originalValue)).myProperty;
            //     originalValue.push(456);
            //     assert.notStrictEqual(clonedValue.length, originalValue.length, `Mutated Arrays must have different lengths`);
            //     assert.notDeepEqual(originalValue, clonedValue, `Mutated Arrays must have different contents`);
            // });
        });

        typeName = `Buffer`;
        describe(typeName, function () {
            const valueToClone = new Buffer(`Boom! 💥`, `utf-8`);

            it(`can deep copy a ${ typeName }`, function () {
                testGenericClone(cloner, typeName, valueToClone);
            });

            it(`can deep copy a ${ typeName } contained in an object property`, function () {
                const clonedValue = testGenericPropertyClone(cloner, typeName, valueToClone);
                assert.strictEqual(clonedValue.length, valueToClone.length, `Buffer length must remain the same`);
            });

            it(`mutating a Buffer does not alter the clone`, function () {
                const originalValue = new Buffer(`Boom! 💥`, `utf-8`);
                const clonedValue = cloner(wrapInObject(originalValue)).myProperty;
                originalValue.write(`💀`);
                assert.notStrictEqual(clonedValue.toString(`utf-8`), originalValue.toString(`utf-8`), `Mutating a Buffer should not update the cloned instance`);
            });
        });

        typeName = `Date`;
        describe(typeName, function () {
            const valueToClone = new Date(Date.UTC(2018, 1, 17));

            it(`can deep copy a ${ typeName }`, function () {
                testGenericClone(cloner, typeName, valueToClone);
            });

            it(`can deep copy a ${ typeName } contained in an object property`, function () {
                testGenericPropertyClone(cloner, typeName, valueToClone);
            });

            it(`mutating a Date does not alter the clone`, function () {
                const originalValue = new Date(Date.UTC(2018, 1, 17));
                const clonedValue = cloner(wrapInObject(originalValue)).myProperty;
                originalValue.setUTCDate(18);
                assert.notStrictEqual(originalValue.getUTCDate(), clonedValue.getUTCDate(), `Mutating a Date should not update the cloned instance`);
            });
        });

        typeName = `Map`;
        describe(typeName, function () {
            it(`can deep copy a Map`, function () {
                const map = new Map<string, string>();
                map.set('key', 'value');

                const copiedMap = cloner(map);
                assert.notStrictEqual(map, copiedMap, `The cloned Map should not reference the same object in memory`);
                assert.strictEqual(map.size, copiedMap.size, `The cloned Map should have the same size as the original Map`);
                assert.strictEqual(map.get('key'), copiedMap.get('key'), `Both maps should hold the same key/value pairs`);
            });

            it(`can deep copy a Map contained in an object property`, function () {
                const map = new Map<string, string>();
                map.set('key', 'value');
                const obj = wrapInObject(map);

                const copiedObj = cloner(obj);
                assert.notStrictEqual(obj, copiedObj, `The cloned object should not reference the same object in memory`);
                assert.notStrictEqual(copiedObj.myProperty, undefined, `The cloned object should have a property called "myProperty"`);
                const copiedMap = copiedObj.myProperty;
                assert.notStrictEqual(map, copiedMap, `Properties holding Maps should not reference the same object in memory`);
                assert.strictEqual(map.size, copiedMap.size, `The cloned Map should have the same size as the original Map`);
                assert.strictEqual(map.get('key'), copiedMap.get('key'), `Both maps should hold the same key/value pairs`);
            });

            it(`can deep copy a class that extends Map`, function () {
                let overridingMethodWasCalled = false;
                class DefaultMap<K, V> extends Map<K, V> {
                    constructor(
                        public readonly defaultValueFactory : (key : K) => V,
                        entries? : [K, V][]
                    ) {
                        super(entries);
                    }

                    get(key : K) : V {
                        overridingMethodWasCalled = true;
                        if (!this.has(key)) {
                            const value = this.defaultValueFactory(key);
                            this.set(key, value);
                            return value;
                        } else {
                            return super.get(key)!;
                        }
                    }
                }

                const defaultValue = 'placeholder';
                const map = new DefaultMap(() => defaultValue);
                const obj = wrapInObject(map);

                const copiedObj = cloner(obj);
                assert.notStrictEqual(obj.myProperty, copiedObj.myProperty, `Properties holding Maps should not reference the same object in memory`);
                assert.strictEqual(obj.myProperty.size, copiedObj.myProperty.size, `The cloned Map should have the same size as the original Map`);
                assert.strictEqual(obj.myProperty.defaultValueFactory, copiedObj.myProperty.defaultValueFactory, `The 'defaultValueFactory' property should be copied`);

                const value = copiedObj.myProperty.get('nonExistentKey');
                assert.ok(overridingMethodWasCalled, `The overriding method on DefaultMap should be called`);
                assert.strictEqual(value, defaultValue, `The cloned Map should be a DefaultMap, and should return the default value when given a non-existent key`);
                assert.notStrictEqual(obj.myProperty.size, copiedObj.myProperty.size, `After implicitly inserting an element, the cloned Map should have a different size to the original Map`);
            });
        });

        typeName = `Set`;
        describe(typeName, function () {
            const valueToClone = new Set([1, 2, 3]);

            it(`can deep copy a ${ typeName }`, function () {
                testGenericClone(cloner, typeName, valueToClone);
            });

            it(`can deep copy a ${ typeName } contained in an object property`, function () {
                testGenericPropertyClone(cloner, typeName, valueToClone);
            });

            it(`mutating a Set does not alter the clone`, function () {
                const originalValue = new Set([1, 2, 3]);
                const clonedValue = cloner(wrapInObject(originalValue)).myProperty;
                originalValue.add(4);
                assert.notStrictEqual(originalValue.size, clonedValue.size, `The Sets should have different lengths`);
            });
        });

        typeName = `RegExp`;
        describe(typeName, function () {
            const valueToClone = new RegExp(`.*`, 'g');

            it(`can deep copy a ${ typeName }`, function () {
                testGenericClone(cloner, typeName, valueToClone);
            });

            it(`can deep copy a ${ typeName } contained in an object property`, function () {
                testGenericPropertyClone(cloner, typeName, valueToClone);
            });
        });

        describe(`Typed Arrays`, function () {
            const typesToTest = [
                Int8Array,
                Uint8Array,
                Uint8ClampedArray,
                Int16Array,
                Uint16Array,
                Int32Array,
                Uint32Array,
                Float32Array,
                Float64Array
            ];

            for (const typeToTest of typesToTest) {
                const typeToTestName = typeToTest.name;
                describe(typeToTestName, function () {
                    const valueToClone = new typeToTest([1, 2, 3]);

                    it(`can deep copy a ${ typeToTestName }`, function () {
                        const clonedValue = testGenericClone(cloner, typeToTestName, valueToClone);
                        assert.strictEqual(clonedValue.length, valueToClone.length, `Cloned ${ typeToTestName } must keep the same length`);
                    });

                    it(`can deep copy a ${ typeToTestName } contained in an object property`, function () {
                        const clonedValue = testGenericPropertyClone(cloner, typeToTestName, valueToClone);
                        assert.strictEqual(clonedValue.length, valueToClone.length, `Cloned ${ typeToTestName } must keep the same length`);
                    });

                    it(`mutating a ${ typeToTestName } does not alter the clone`, function () {
                        const originalValue = new typeToTest([1, 2, 3]);
                        const clonedValue = cloner(wrapInObject(originalValue)).myProperty;
                        originalValue[0] = 4;
                        originalValue[1] = 5;
                        originalValue[2] = 6;
                        assert.notStrictEqual(clonedValue.length, undefined, `Cloned ${ typeToTestName } must have a "length" property`);
                        assert.notDeepEqual(originalValue, clonedValue, `Mutated ${ typeToTestName } must have different contents`);
                        assert.notStrictEqual(clonedValue.length, originalValue.length, `Mutated ${ typeToTestName } must have different lengths`);
                    });
                });
            }
        });
    });
}