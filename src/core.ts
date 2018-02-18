export function last<T>(arr : T[]) : T | undefined {
    return arr[arr.length - 1];
}

export class DefaultMap<K, V> extends Map<K, V> {
    constructor(private defaultValueFactory : (key : K, map : Map<K, V>) => V, iterable? : [K, V][]) {
        super(iterable);
    }

    get(key : K) : V {
        if (!this.has(key)) {
            const value = this.defaultValueFactory(key, this);
            this.set(key, value);
            return value;
        } else {
            return super.get(key)!; // should never be undefined
        }
    }
}