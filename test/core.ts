import "../typings/@yarnpkg/lockfile";
import * as appRootPath from 'app-root-path';
import * as assert from 'assert';
import * as lockfile from '@yarnpkg/lockfile';
import {readFileSync} from "fs";

export type Cloner = <T>(obj : T) => T;

function wrapInObject<T>(value : T) : { myProperty : T } {
    return {
        myProperty : value
    };
}

function testPropertiesThatShouldExist<T>(typeName : string, value : T, propertiesThatShouldExist : Array<keyof T>) : void {
    for (const propertyName of propertiesThatShouldExist) {
        assert.notStrictEqual(value[propertyName], undefined, `The cloned ${ typeName } should have a property "${ propertyName }"`);
    }
}

function testPropertiesThatShouldNotExist<T>(typeName : string, value : T, propertiesThatShouldExist : Array<keyof T>) : void {
    for (const propertyName of propertiesThatShouldExist) {
        assert.strictEqual(value[propertyName], undefined, `The cloned ${ typeName } should not have a property "${ propertyName }"`);
    }
}

function testGenericClone<T>(cloner : Cloner, typeName : string, valueToClone : T, propertiesThatShouldExist : Array<keyof T>) : T {
    const clonedValue = cloner(valueToClone);
    assert.notStrictEqual(clonedValue, valueToClone, `The cloned ${ typeName } should not reference the same object in memory`);
    testPropertiesThatShouldExist(typeName, clonedValue, propertiesThatShouldExist);
    return clonedValue;
}

function testGenericPropertyClone<T>(cloner : Cloner, typeName : string, valueToClone : T, propertiesThatShouldExist : Array<keyof T>) : T {
    const obj = wrapInObject(valueToClone);

    const clonedObjectValue = cloner(obj);
    assert.notStrictEqual(obj, clonedObjectValue, `The cloned object should not reference the same object in memory`);
    assert.notStrictEqual(clonedObjectValue.myProperty, undefined, `The cloned object should have a property called "myProperty"`);
    const clonedPropertyValue = clonedObjectValue.myProperty;
    assert.notStrictEqual(valueToClone, clonedPropertyValue, `The cloned ${ typeName } should not reference the same object in memory`);
    testPropertiesThatShouldExist(typeName, clonedPropertyValue, propertiesThatShouldExist);
    return clonedPropertyValue;
}

export interface TestSuiteOverrides {
    ArrayBuffer? : () => void;
}

export interface CloneLibraryOptions {
    cloner? : Cloner;
    testSuiteOverrides? : TestSuiteOverrides;
}

export function parseLibraryVersions() {
    let unparsedLockfile = readFileSync(appRootPath.resolve('yarn.lock'), 'utf8');
    // work around a bug in @yarnpkg/lockfile@1.0.0, it can't read Windows CRLF line endings.
    unparsedLockfile = unparsedLockfile.replace(/\r/g, '');
    const parsedLockfile = lockfile.parse(unparsedLockfile);
    const libVersionMap = new Map<string, string>();
    if (parsedLockfile.type === 'success') {
        for (const key of Object.keys(parsedLockfile.object)) {
            const libName = key.substring(0, key.indexOf('@'));
            const value = parsedLockfile.object[key].version;
            libVersionMap.set(libName, value);
        }
    } else {
        throw new Error('Unable to parse yarn.lock');
    }
    return libVersionMap;
}

const libVersionMap : Map<string, string> = parseLibraryVersions();

export function testCloneLibrary(libraryName : string, cloneLibraryOptions : CloneLibraryOptions = {}) {
    let cloner : Cloner;
    if (cloneLibraryOptions.cloner) {
        cloner = cloneLibraryOptions.cloner;
    } else {
        const cloneLib = require(libraryName);
        cloner = <T>(obj : T) => cloneLib(obj);
    }
    const testSuiteOverrides : TestSuiteOverrides = cloneLibraryOptions.testSuiteOverrides || {};
    const libraryVersion = libVersionMap.get(libraryName) || '';
    if (libraryVersion) {
        libraryName = `${ libraryName } v${ libraryVersion}`;
    }

    describe(libraryName, function () {

        describe(`Array`, function () {
            const typeName = `Array`;
            const expectedProperties : Array<keyof Array<any>> = [
                'concat',
                'length'
            ];
            const valueToClone = [{ myProperty: 1 }];

            it(`can deep copy an ${ typeName }`, function () {
                const clonedValue = testGenericClone(cloner, typeName, valueToClone, expectedProperties);
                assert.notStrictEqual(clonedValue[0], valueToClone[0], `Array object values should not reference the same object in memory`);
            });

            it(`can deep copy an ${ typeName } contained in an object property`, function () {
                const clonedValue = testGenericPropertyClone(cloner, typeName, valueToClone, expectedProperties);
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

        describe(`ArrayBuffer`, testSuiteOverrides.ArrayBuffer || function () {
            const typeName = `ArrayBuffer`;
            const expectedProperties : Array<keyof ArrayBuffer> = [
                'byteLength',
                'slice'
            ];
            const valueToClone = new ArrayBuffer(3);
            const originalDataView = new DataView(valueToClone);
            originalDataView.setInt8(0, 1);
            originalDataView.setInt8(1, 2);
            originalDataView.setInt8(2, 3);

            it(`can deep copy an ${ typeName }`, function () {
                const clonedValue = testGenericClone(cloner, typeName, valueToClone, expectedProperties);
                assert.doesNotThrow(() => new DataView(clonedValue), `Cloned ArrayBuffers can be passed to the DataView constructor without throwing a TypeError`);
                const cloneDataView = new DataView(clonedValue);
                assert.strictEqual(originalDataView.byteLength, cloneDataView.byteLength, `Cloned ArrayBuffers must keep the same length`);
                assert.strictEqual(originalDataView.getInt8(0), originalDataView.getInt8(0), `Cloned ArrayBuffers values must remain the same`);
            });

            it(`can deep copy an ${ typeName } contained in an object property`, function () {
                const clonedValue : ArrayBuffer = testGenericPropertyClone(cloner, typeName, valueToClone, expectedProperties);
                assert.doesNotThrow(() => new DataView(clonedValue), `Cloned ArrayBuffers can be passed to the DataView constructor without throwing a TypeError`);
                const cloneDataView = new DataView(clonedValue!);
                assert.strictEqual(originalDataView.byteLength, cloneDataView.byteLength, `Cloned ArrayBuffers must keep the same length`);
                assert.strictEqual(originalDataView.getInt8(0), originalDataView.getInt8(0), `Cloned ArrayBuffers values must remain the same`);
            });

            it(`mutating an ArrayBuffer does not alter the clone`, function () {
                const originalValue = new ArrayBuffer(3);
                const originalDataView = new DataView(valueToClone);
                originalDataView.setInt8(0, 1);
                originalDataView.setInt8(1, 2);
                originalDataView.setInt8(2, 3);
                let clonedValue : ArrayBuffer;
                assert.doesNotThrow(() => {
                    clonedValue = cloner(wrapInObject(originalValue)).myProperty;
                });
                assert.doesNotThrow(() => new DataView(clonedValue), `Cloned ArrayBuffers can be passed to the DataView constructor without throwing a TypeError`);
                const cloneDataView = new DataView(clonedValue!);
                originalDataView.setInt8(0, 10);
                assert.notDeepEqual(originalDataView.getInt8(0), cloneDataView.getInt8(0), `Mutated ArrayBuffers must have different contents`);
            });
        });

        describe(`Buffer`, function () {
            const typeName = `Buffer`;
            const expectedProperties : Array<keyof Buffer> = [
                'length',
                'copy',
                'BYTES_PER_ELEMENT'
            ];
            const valueToClone = new Buffer(`Boom! 💥`, `utf-8`);

            it(`can deep copy a ${ typeName }`, function () {
                const clonedValue = testGenericClone(cloner, typeName, valueToClone, expectedProperties);
                assert.strictEqual(clonedValue.length, valueToClone.length, `Buffer length must remain the same`);
            });

            it(`can deep copy a ${ typeName } contained in an object property`, function () {
                const clonedValue = testGenericPropertyClone(cloner, typeName, valueToClone, expectedProperties);
                assert.strictEqual(clonedValue.length, valueToClone.length, `Buffer length must remain the same`);
            });

            it(`mutating a Buffer does not alter the clone`, function () {
                const originalValue = new Buffer(`Boom! 💥`, `utf-8`);
                const clonedValue = cloner(wrapInObject(originalValue)).myProperty;
                originalValue.write(`💀`);
                assert.notStrictEqual(clonedValue.toString(`utf-8`), originalValue.toString(`utf-8`), `Mutating a Buffer should not update the cloned instance`);
            });
        });

        describe(`Date`, function () {
            const typeName = `Date`;
            const expectedProperties : Array<keyof Date> = [
                "getDate",
                "valueOf",
                "setUTCDate"
            ];
            const valueToClone = new Date(Date.UTC(2018, 1, 17));

            it(`can deep copy a ${ typeName }`, function () {
                testGenericClone(cloner, typeName, valueToClone, expectedProperties);
            });

            it(`can deep copy a ${ typeName } contained in an object property`, function () {
                testGenericPropertyClone(cloner, typeName, valueToClone, expectedProperties);
            });

            it(`mutating a Date does not alter the clone`, function () {
                const originalValue = new Date(Date.UTC(2018, 1, 17));
                const clonedValue = cloner(wrapInObject(originalValue)).myProperty;
                originalValue.setUTCDate(18);
                assert.notStrictEqual(originalValue.getUTCDate(), clonedValue.getUTCDate(), `Mutating a Date should not update the cloned instance`);
            });
        });

        describe(`Map`, function () {
            const typeName = `Map`;
            const expectedProperties : Array<keyof Map<any, any>> = [
                "size",
                "set",
                "get",
                "has"
            ];
            const valueToClone = new Map<string, string>([
                ['key', 'value']
            ]);

            it(`can deep copy a Map`, function () {
                const clonedValue = testGenericClone(cloner, typeName, valueToClone, expectedProperties);
                assert.strictEqual(clonedValue.size, valueToClone.size, `The cloned Map should have the same size as the original Map`);
                assert.strictEqual(clonedValue.get('key'), valueToClone.get('key'), `Both maps should hold the same key/value pairs`);
            });

            it(`can deep copy a Map contained in an object property`, function () {
                const clonedValue = testGenericPropertyClone(cloner, typeName, valueToClone, expectedProperties);
                assert.strictEqual(clonedValue.size, valueToClone.size, `The cloned Map should have the same size as the original Map`);
                assert.strictEqual(clonedValue.get('key'), valueToClone.get('key'), `Both maps should hold the same key/value pairs`);
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

        describe(`Object`, function () {
            const typeName = `Object`;
            const expectedProperties : Array<keyof Object> = [
                "constructor",
                "hasOwnProperty",
                "propertyIsEnumerable"
            ];
            const valueToClone = { myProperty: 123 };

            it(`can deep copy an Object`, function () {
                testGenericClone<Object>(cloner, typeName, valueToClone, expectedProperties);
            });

            it(`can deep copy an Object contained in an object property`, function () {
                testGenericPropertyClone<Object>(cloner, typeName, valueToClone, expectedProperties);
            });

            it(`can deep copy an Object that does not inherit from Object`, function () {
                const valueToClone = Object.create(null);
                valueToClone.myProperty = 123;
                const clonedValue = testGenericClone<{ myProperty : number }>(cloner, typeName, valueToClone, ['myProperty']);
                testPropertiesThatShouldNotExist<Object>(typeName, clonedValue, expectedProperties);
            });

            it(`can deep copy an Object that does not inherit from Object, contained in an object property`, function () {
                const valueToClone = Object.create(null);
                valueToClone.myProperty = 123;
                const clonedValue = testGenericPropertyClone<{ myProperty : number }>(cloner, typeName, valueToClone, ['myProperty']);
                testPropertiesThatShouldNotExist<Object>(typeName, clonedValue, expectedProperties);
            });

            it(`allows circular references`, function () {
                interface Parent {
                    child : Child;
                }
                interface Child {
                    parent? : Parent;
                }

                const child : Child = {};
                const parent : Parent = {
                    child
                };
                child.parent = parent;
                let clonedValue : Parent;
                try {
                    clonedValue = cloner(parent);
                } catch (err) {
                    if (err instanceof RangeError) {
                        assert.fail(`Circular references should not cause an infinite loop / "maximum call stack size exceeded" error`);
                    } else {
                        throw err;
                    }
                }
                assert.notStrictEqual(clonedValue!, parent, `Parent and clone should not reference the same object in memory`);
                assert.notStrictEqual(clonedValue!.child, parent.child, `Child and clone's child should not reference the same object in memory`);
                assert.strictEqual(clonedValue!.child.parent, clonedValue!, `The cloned circular reference should reference the same object in memory`);
            });

            it(`class inheritance preserves properties in the inheritance chain`, function () {
                class GrandparentClass {
                    propertyOnGrandparent = 123;
                }
                class ParentClass extends GrandparentClass {
                    propertyOnParent = 456;
                }
                class ChildClass extends ParentClass {
                }

                const valueToClone = new ChildClass();
                const clonedValue = cloner(wrapInObject(valueToClone)).myProperty;
                assert.notStrictEqual(valueToClone.propertyOnParent, undefined, `The original instance should have a property from ParentClass`);
                assert.notStrictEqual(valueToClone.propertyOnGrandparent, undefined, `The original instance should have a property from GrandparentClass`);
                assert.notStrictEqual(clonedValue.propertyOnParent, undefined, `The cloned instance should have a property from ParentClass`);
                assert.notStrictEqual(clonedValue.propertyOnGrandparent, undefined, `The cloned instance should have a property from GrandparentClass`);
            });

            it(`class inheritance works with "instanceof"`, function () {
                class GrandparentClass {
                }
                class ParentClass extends GrandparentClass {
                }
                class ChildClass extends ParentClass {
                }

                const valueToClone = new ChildClass();
                const clonedValue = cloner(wrapInObject(valueToClone)).myProperty;
                assert.ok(valueToClone instanceof ParentClass, `The original instance can be identified as inheriting from ParentClass using "instanceof"`);
                assert.ok(valueToClone instanceof GrandparentClass, `The original instance can be identified as inheriting from GrandparentClass using "instanceof"`);
                assert.ok(clonedValue instanceof ParentClass, `The cloned instance can be identified as inheriting from ParentClass using "instanceof"`);
                assert.ok(clonedValue instanceof GrandparentClass, `The cloned instance can be identified as inheriting from GrandparentClass using "instanceof"`);
            });
        });

        describe(`Set`, function () {
            const typeName = `Set`;
            const expectedProperties : Array<keyof Set<any>> = [
                "add",
                "size"
            ];
            const valueToClone = new Set([1, 2, 3]);

            it(`can deep copy a ${ typeName }`, function () {
                const clonedValue = testGenericClone(cloner, typeName, valueToClone, expectedProperties);
                assert.strictEqual(valueToClone.size, clonedValue.size, `The Sets should have the same lengths`);
            });

            it(`can deep copy a ${ typeName } contained in an object property`, function () {
                const clonedValue = testGenericPropertyClone(cloner, typeName, valueToClone, expectedProperties);
                assert.strictEqual(valueToClone.size, clonedValue.size, `The Sets should have the same lengths`);
            });

            it(`mutating a Set does not alter the clone`, function () {
                const originalValue = new Set([1, 2, 3]);
                const clonedValue = cloner(wrapInObject(originalValue)).myProperty;
                originalValue.add(4);
                assert.notStrictEqual(originalValue.size, clonedValue.size, `The Sets should have different lengths`);
            });
        });

        describe(`RegExp`, function () {
            const typeName = `RegExp`;
            const expectedProperties : Array<keyof RegExp> = [
                "global",
                "compile",
                "source",
                "flags"
            ];
            const valueToClone = new RegExp(`.*`, 'g');

            it(`can deep copy a ${ typeName }`, function () {
                testGenericClone(cloner, typeName, valueToClone, expectedProperties);
            });

            it(`can deep copy a ${ typeName } contained in an object property`, function () {
                testGenericPropertyClone(cloner, typeName, valueToClone, expectedProperties);
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

            type TypedArray = (
                Int8Array
                | Uint8Array
                | Uint8ClampedArray
                | Int16Array
                | Uint16Array
                | Int32Array
                | Uint32Array
                | Float32Array
                | Float64Array
            );

            for (const typeToTest of typesToTest) {
                const typeToTestName = typeToTest.name;
                describe(typeToTestName, function () {
                    const expectedProperties : Array<keyof TypedArray> = [
                        "byteLength",
                        "copyWithin"
                    ];
                    const valueToClone = new typeToTest([1, 2, 3]);

                    it(`can deep copy a ${ typeToTestName }`, function () {
                        const clonedValue = testGenericClone(cloner, typeToTestName, valueToClone, expectedProperties);
                        assert.strictEqual(clonedValue.length, valueToClone.length, `Cloned ${ typeToTestName } must keep the same length`);
                    });

                    it(`can deep copy a ${ typeToTestName } contained in an object property`, function () {
                        const clonedValue = testGenericPropertyClone(cloner, typeToTestName, valueToClone, expectedProperties);
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