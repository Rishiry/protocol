import { Client } from './Network'; // Adjust the import path if needed
import { Protocol } from './Protocol'
import { Log } from './Log';
import { DataProcessor } from './DataProcessor';
import * as fs from 'fs'
import * as path from 'path'

import * as ProtocolTypes from '../types/Protocol';

class Actor {
    protected client: Client;
    public clientId: string | null = null;
    private readonly registerTimeout = 10 * 1000; // 10 seconds

    // Map to store handlers for different message types
    protected messageHandlers: Map<ProtocolTypes.MessageType, (decodedMessage: any) => void> = new Map();

    constructor() {
        this.client = new Client();
        this.client.start(); // Start the client
        this.client.receive(this.onReceive.bind(this));

        // Register common handlers
        this.messageHandlers.set(ProtocolTypes.MessageType.RegisterResponse, this.handleRegister.bind(this));
    }

    protected onReceive(msg: Buffer, info) {
        const decodedMessage = Protocol.decode(msg);
        const header = decodedMessage.message.header;

        const handler = this.messageHandlers.get(header.messageType);
        if (handler) {
            handler(decodedMessage);
        }
    }

    protected handleRegister(decodedMessage) {
        const payload: ProtocolTypes.RegisterResponsePayload = decodedMessage.message.payload;
        this.clientId = payload.clientID;

        Log.success("Registered Successfully.\tClient ID:" + this.clientId);
    }

    register(role: ProtocolTypes.Role): Promise<string> {
        return new Promise((resolve, reject) => {

            const protocol = new Protocol({
                header: {
                    messageType: ProtocolTypes.MessageType.Register,
                    role: role
                },
                payload: null
            });

            const retrySending = () => {
                this.client.send(protocol.encode());
                setTimeout(() => {
                    if (!this.clientId) { // if ID is not set after 10 seconds, retry
                        retrySending();
                    }
                }, this.registerTimeout);
            };

            retrySending();
        });
    }

    protected send(msg: Buffer) {
        this.client.send(msg);
    }
}



class Consumer extends Actor {
    private dataIn: { [channel: string]: { [i: number]: Buffer[] } } = {};
    private subscribed: string[] = [];

    constructor() {
        super();
        // Add specific handlers for Consumer
        this.messageHandlers.set(ProtocolTypes.MessageType.ListResponse, this.handleList.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.Subscribe, this.handleSubscribe.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.Unsubscribe, this.handleUnsubscribe.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.Publish, this.handlePublish.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.PublishCompressed, this.handlePublishCompressed.bind(this));
        // Register error handlers
        this.messageHandlers.set(ProtocolTypes.MessageType.RegisterError, this.handleError.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.SubscribeError, this.handleError.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.UnsubscribeError, this.handleError.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.MessageError, this.handleError.bind(this));
    }

    public list(): void {
        const protocol = new Protocol({
            header: {
                messageType: ProtocolTypes.MessageType.List
            },
            payload: null
        });
        this.send(protocol.encode());
    }

    public handleList(decodedMessage): void {
        const payload: ProtocolTypes.ListResponsePayload = decodedMessage.message.payload;

        Log.table(JSON.parse(payload.topics))

    }
    
    public subscribe(topicID: string): void {
        const protocol = new Protocol({
            header: {
                messageType: ProtocolTypes.MessageType.Subscribe
            },
            payload: { topicID: topicID }
        });
        this.send(protocol.encode());
    }

    public unsubscribe(topicID: string): void {
        const protocol = new Protocol({
            header: {
                messageType: ProtocolTypes.MessageType.Unsubscribe
            },
            payload: { topicID: topicID }
        });
        this.send(protocol.encode());
    }

    protected handleSubscribe(decodedMessage) {
        const payload: ProtocolTypes.SubscribeUnsubscribePayload = decodedMessage.message.payload;
        this.subscribed.push(payload.topicID);

        Log.success("Subscribed to channel");
    }

    protected handleUnsubscribe(decodedMessage) {
        const payload: ProtocolTypes.SubscribeUnsubscribePayload = decodedMessage.message.payload;
        const index = this.subscribed.indexOf(payload.topicID);
        if (index > -1) {
            this.subscribed.splice(index, 1);
        }

        Log.success("Unsubscribed from channel");
    }

    protected handleError(decodedMessage) {
        const payload: ProtocolTypes.ErrorPayload = decodedMessage.message.payload;
        Log.error(payload.error);
    }

    protected handlePublish(decodedMessage) {
        const header: ProtocolTypes.PublishHeader = decodedMessage.message.header;
        const payload: Buffer = decodedMessage.message.payload;

        this.storeChunk(header.topicID, header.i, header.n, payload, false);
    }

    protected handlePublishCompressed(decodedMessage) {
        const header: ProtocolTypes.PublishHeader = decodedMessage.message.header;
        const payload: Buffer = decodedMessage.message.payload;

        // Decompress the data before storing
        const dataProcessor = new DataProcessor(payload);
        dataProcessor.decompress();

        this.storeChunk(header.topicID, header.i, header.n, dataProcessor.data, true);
    }




    private putToDisk(channel: string, i: number, data: Buffer) {
        const outputDir = 'output_'+this.clientId.replace(/\x00/g, '');
        const channelDir = path.join(outputDir, channel.replace(/\x00/g, ''));
        
        // Ensure the 'output' directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        
        // Ensure the 'channel' directory exists within 'output'
        if (!fs.existsSync(channelDir)) {
            fs.mkdirSync(channelDir);
        }
    
        // Write the file inside the channel directory
        const filePath = path.join(channelDir, `${i}.png`);
        fs.writeFileSync(filePath, data);
    
        console.log(`File saved at ${filePath}`);
    
        // Clear the stored chunks for this i value for this channel
        delete this.dataIn[channel][i];
    }
    
    private storeChunk(channel: string, i: number, n: number, chunk: Buffer, compress: boolean = false) {
        // Initialize the object for this channel if not already done
        if (!this.dataIn[channel]) {
            this.dataIn[channel] = {};
        }

        // Initialize the array for this i value if not already done
        if (!this.dataIn[channel][i]) {
            this.dataIn[channel][i] = [];
        }

        // Store the chunk
        this.dataIn[channel][i].push(chunk);

        if (this.dataIn[channel][i].length === n) {
            const reconstructedData = new DataProcessor(null);
            reconstructedData.chunks = this.dataIn[channel][i];
            reconstructedData.reconstruct();
    
            if (compress) {
                reconstructedData.decompress();
            }
    
            this.putToDisk(channel, i, reconstructedData.data);
    
            Log.message(`Reconstructed data for topic=${channel}, i=${i}`);
        }
    }
    
}

class Producer extends Actor {
    private announcedTopics: string[] = [];

    constructor() {
        super();
        this.messageHandlers.set(ProtocolTypes.MessageType.AnnounceResponse, this.handleAnnounce.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.PublishResponse, this.handlePublish.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.PublishCompressedResponse, this.handlePublish.bind(this));
        // Register error handlers
        this.messageHandlers.set(ProtocolTypes.MessageType.AnnounceError, this.handleError.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.PublishError, this.handleError.bind(this));
        this.messageHandlers.set(ProtocolTypes.MessageType.PublishCompressedError, this.handleError.bind(this));
    }

    public announce(topicID: string, allowMessaging: boolean, description: string): void {
        const protocol = new Protocol({
            header: {
                messageType: ProtocolTypes.MessageType.Announce
            },
            payload: { topicID, allowMessaging: allowMessaging, description: description }
        });
        Log.info("Attempting to Announce: " + topicID);
        this.send(protocol.encode());
    }

    protected handleAnnounce(decodedMessage) {
        const payload: ProtocolTypes.AnnounceResponsePayload = decodedMessage.message.payload;
        this.announcedTopics.push(payload.topicID);

        Log.success("New Topic Announced: " + payload.topicID);
    }

    public publish(topicID: string, i: number, d: Buffer, compress: boolean = false): void {
        const data = new DataProcessor(d);
        if (compress) {
            data.compress();
        }
        const chunk_count = data.chunk();

        Log.info("Sending " + chunk_count + " Chunks");

        for (var c = 0; c < chunk_count; c++) {
            var protocol = new Protocol({
                header: {
                    messageType: compress 
                        ? ProtocolTypes.MessageType.PublishCompressed 
                        : ProtocolTypes.MessageType.Publish,
                    topicID: topicID,
                    i: i,
                    n: chunk_count
                },
                payload: data.chunks[c]
            });
            this.send(protocol.encode());
        }
        Log.debug("Published " + chunk_count + " Chunks");

    }

    protected handlePublish(decodedMessage) {
        Log.debug("Published a Chunk");
    }

    protected handleError(decodedMessage) {
        const payload: ProtocolTypes.ErrorPayload = decodedMessage.message.payload;
        Log.error(payload.error);
    }
}

export { Consumer, Producer };
