import * as zlib from 'zlib';

class DataProcessor {
    private static readonly CHUNK_SIZE = 1024 * 4
    data: Buffer;
    chunks: Buffer[] = [];

    constructor(data: Buffer) {
        this.data = data;
    }

    putChunk(chunk: Buffer) {
        this.chunks.push(chunk)
    }

    compress(): void {
        this.data = zlib.gzipSync(this.data);
    }

    decompress(): void {
        this.data = zlib.gunzipSync(this.data);
    }

    chunk(): number {
        const numberOfChunks = Math.ceil(this.data.length / (DataProcessor.CHUNK_SIZE - 4)); // -4 for the id
        this.chunks = [];
        for (let i = 0; i < numberOfChunks; i++) {
            const start = i * (DataProcessor.CHUNK_SIZE - 4);
            const end = Math.min(start + DataProcessor.CHUNK_SIZE - 4, this.data.length);
            const chunkData = this.data.slice(start, end);

            const buffer = Buffer.alloc(4);
            buffer.writeInt32BE(i, 0);  // writing the id as a 32-bit BE integer
            this.chunks.push(Buffer.concat([buffer, chunkData]));
        }
        return numberOfChunks;
    }

    reconstruct(): void {
        // Extract id from each chunk and sort by id.
        const sortedChunks = this.chunks
            .map(chunk => ({
                id: chunk.readInt32BE(0),
                data: chunk.slice(4)
            }))
            .sort((a, b) => a.id - b.id)
            .map(chunk => chunk.data);

        this.data = Buffer.concat(sortedChunks);
        this.chunks = []; // Clear the chunks after reconstruction
    }
}

export {DataProcessor};