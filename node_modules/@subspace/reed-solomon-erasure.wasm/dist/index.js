    const currentScript = globalThis.document && globalThis.document.currentScript;
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const fs_1 = require("fs");
    class ReedSolomonErasure {
        constructor(exports) {
            this.exports = exports;
            this.memoryCache = null;
        }
        /**
         * Automagical method that will try to detect environment (Node.js or browser) and load *.wasm file from current directory
         */
        static async fromCurrentDirectory() {
            if (currentScript) {
                const pathToCurrentScript = currentScript.src.split('/').slice(0, -1).join('/');
                return ReedSolomonErasure.fromResponse(fetch(`${pathToCurrentScript}/reed_solomon_erasure_bg.wasm`));
            }
            else {
                return ReedSolomonErasure.fromBytes(fs_1.readFileSync(`${__dirname}/reed_solomon_erasure_bg.wasm`));
            }
        }
        /**
         * For asynchronous instantiation, primarily in Browser environment, expects you to load WASM file with `fetch()`
         */
        static async fromResponse(source) {
            // @ts-ignore WebAssembly.instantiateStreaming is not known by TypeScript yet
            const { instance } = await WebAssembly.instantiateStreaming(source);
            return new ReedSolomonErasure(instance.exports);
        }
        /**
         * For synchronous instantiation, primarily in Node.js environment
         */
        static fromBytes(bytes) {
            const module = new WebAssembly.Module(bytes);
            const instance = new WebAssembly.Instance(module);
            return new ReedSolomonErasure(instance.exports);
        }
        /**
         * Takes a contiguous array of bytes that contain space for `data_shards + parity_shards` shards with `data_shards` shards containing data and fills
         * additional `parity_shards` with parity information that can be later used to reconstruct data in case of corruption
         *
         * @param shards
         * @param dataShards
         * @param parityShards
         *
         * @returns One of `RESULT_*` constants; if `RESULT_OK` then parity shards were updated in `shards` in-place
         */
        encode(shards, dataShards, parityShards) {
            const exports = this.exports;
            const shardsLength = shards.length;
            const shardsPointer = exports.__wbindgen_malloc(shardsLength);
            this.getUint8Memory().set(shards, shardsPointer);
            const shardSize = shardsLength / (dataShards + parityShards);
            const result = exports.encode(shardsPointer, shardsLength, dataShards, parityShards);
            if (result === ReedSolomonErasure.RESULT_OK) {
                shards.set(this.getUint8Memory().subarray(shardsPointer + shardSize * dataShards, shardsPointer + shardsLength), shardSize * dataShards);
            }
            exports.__wbindgen_free(shardsPointer, shardsLength);
            return result;
        }
        /**
         * Takes a contiguous array of bytes that contain `data_shards + parity_shards` shards and tries to reconstruct data shards if they are broken and whenever
         * possible using information from `shards_available` (contains `data_shards + parity_shards` boolean values, each of which is either `true` if shard is not
         * corrupted or `false` if it is)
         *
         * @param shards
         * @param dataShards
         * @param parityShards
         * @param shardsAvailable
         *
         * @returns One of `RESULT_*` constants; if `RESULT_OK` then data shards were reconstructed in `shards` in-place
         */
        reconstruct(shards, dataShards, parityShards, shardsAvailable) {
            const exports = this.exports;
            const shardsLength = shards.length;
            const shardsPointer = exports.__wbindgen_malloc(shardsLength);
            this.getUint8Memory().set(shards, shardsPointer);
            const shardsAvailableLength = shardsAvailable.length;
            const shardsAvailablePointer = exports.__wbindgen_malloc(shardsAvailableLength);
            this.getUint8Memory().set(shardsAvailable.map((value) => value ? 1 : 0), shardsAvailablePointer);
            const shardSize = shardsLength / (dataShards + parityShards);
            const result = exports.reconstruct(shardsPointer, shardsLength, dataShards, parityShards, shardsAvailablePointer, shardsAvailableLength);
            if (result === ReedSolomonErasure.RESULT_OK) {
                shards.set(this.getUint8Memory().subarray(shardsPointer, shardsPointer + shardSize * dataShards));
            }
            exports.__wbindgen_free(shardsPointer, shardsLength);
            exports.__wbindgen_free(shardsAvailablePointer, shardsAvailableLength);
            return result;
        }
        getUint8Memory() {
            let cachegetUint8Memory = this.memoryCache;
            if (cachegetUint8Memory === null ||
                cachegetUint8Memory.buffer !== this.exports.memory.buffer) {
                cachegetUint8Memory = new Uint8Array(this.exports.memory.buffer);
                this.memoryCache = cachegetUint8Memory;
            }
            return cachegetUint8Memory;
        }
    }
    exports.ReedSolomonErasure = ReedSolomonErasure;
    ReedSolomonErasure.RESULT_OK = 0;
    ReedSolomonErasure.RESULT_ERROR_TOO_FEW_SHARDS = 1;
    ReedSolomonErasure.RESULT_ERROR_TOO_MANY_SHARDS = 2;
    ReedSolomonErasure.RESULT_ERROR_TOO_FEW_DATA_SHARDS = 3;
    ReedSolomonErasure.RESULT_ERROR_TOO_MANY_DATA_SHARDS = 4;
    ReedSolomonErasure.RESULT_ERROR_TOO_FEW_PARITY_SHARDS = 5;
    ReedSolomonErasure.RESULT_ERROR_TOO_MANY_PARITY_SHARDS = 6;
    ReedSolomonErasure.RESULT_ERROR_TOO_FEW_BUFFER_SHARDS = 7;
    ReedSolomonErasure.RESULT_ERROR_TOO_MANY_BUFFER_SHARDS = 8;
    ReedSolomonErasure.RESULT_ERROR_INCORRECT_SHARD_SIZE = 9;
    ReedSolomonErasure.RESULT_ERROR_TOO_FEW_SHARDS_PRESENT = 10;
    ReedSolomonErasure.RESULT_ERROR_EMPTY_SHARD = 11;
    ReedSolomonErasure.RESULT_ERROR_INVALID_SHARD_FLAGS = 12;
    ReedSolomonErasure.RESULT_ERROR_INVALID_INDEX = 13;
});
//# sourceMappingURL=index.js.map
