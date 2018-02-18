import { isNullOrUndefined } from "util";

export function iff(condition : boolean, body : () => string, elseBody? : () => string) {
    if (condition) {
        return body();
    } else if (elseBody) {
        return elseBody();
    } else {
        return '';
    }
}

export function exists(obj : any, body : () => string, elseBody? : () => string) {
    return iff(!isNullOrUndefined(obj), body, elseBody);
}

export function mmap<T>(list : T[], cb : (entry : T, index : number) => string) {
    return list.map(cb).join('');
}

export function block<TBlockValues extends { [key : string] : string | undefined }>(name : keyof TBlockValues, values : TBlockValues) : string {
    if (values[name]) {
        return <string> values[name];
    } else {
        return '';
    }
}
