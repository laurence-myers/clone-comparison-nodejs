type Lockfile = {
    type : 'success'; // Or failure?
    object : {
        [key : string] : {
            version : string;
            resolve : string;
        }
    }
};

declare interface LockfileModule {
    parse(value : string) : Lockfile;
}

declare module '@yarnpkg/lockfile' {
    const lockfile : LockfileModule;
    export = lockfile;
}