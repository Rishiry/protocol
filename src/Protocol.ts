import { Buffer } from 'buffer';
import * as ProtocolTypes from '../types/Protocol';

export class Protocol {
    message: ProtocolTypes.ProtocolMessage;

    constructor(message: ProtocolTypes.ProtocolMessage) {
        this.message = message;
    }

    static decode(buffer: Buffer): Protocol {
        let header: ProtocolTypes.Header;
        let payload: ProtocolTypes.Payload = null;

        const messageType: ProtocolTypes.MessageType = buffer.readUInt8(0);

        switch (messageType) {
            case ProtocolTypes.MessageType.Register:
                header = {
                    messageType,
                    role: buffer.readUInt8(1) as ProtocolTypes.Role
                };
                break;
            case ProtocolTypes.MessageType.Publish:
            case ProtocolTypes.MessageType.PublishCompressed:
                header = {
                    messageType,
                    topicID: buffer.toString('utf-8', 1, 21),
                    i: buffer.readUInt32BE(21),
                    n: buffer.readUInt32BE(25)
                };
                payload = buffer.slice(29);  // 1 (msg type) + 20 (topicID) + 4 (i) + 4 (n) = 29
                break;
            case ProtocolTypes.MessageType.Message:
                header = {
                    messageType,
                    topicID: buffer.toString('utf-8', 1, 21)
                }
                payload = buffer.slice(22);  // 1 (msg type) + 20 (topicID) = 21
                break;
            default:
                header = { messageType };
                break;
        }

        // Decode payload only for specific message types
        if ([ProtocolTypes.MessageType.RegisterResponse,
            ProtocolTypes.MessageType.ListResponse,
            ProtocolTypes.MessageType.AnnounceResponse,
            ProtocolTypes.MessageType.RegisterError,
            ProtocolTypes.MessageType.ListError,
            ProtocolTypes.MessageType.AnnounceError,
            ProtocolTypes.MessageType.SubscribeError,
            ProtocolTypes.MessageType.UnsubscribeError,
            ProtocolTypes.MessageType.PublishError,
            ProtocolTypes.MessageType.PublishCompressedError,
            ProtocolTypes.MessageType.MessageError,
            ProtocolTypes.MessageType.Subscribe,
            ProtocolTypes.MessageType.Unsubscribe,
            ProtocolTypes.MessageType.Announce].includes(messageType)) {
            payload = JSON.parse(buffer.toString('utf-8', 1));
        }

        return new Protocol({ header, payload });
    }

    encode(): Buffer {
        let buffer: Buffer;

        // Start by encoding the header
        switch (this.message.header.messageType) {
            case ProtocolTypes.MessageType.Register:
                buffer = Buffer.alloc(2);
                buffer.writeUInt8(this.message.header.messageType, 0);
                buffer.writeUInt8((this.message.header as ProtocolTypes.RegisterHeader).role, 1);
                break;
            case ProtocolTypes.MessageType.Publish:
            case ProtocolTypes.MessageType.PublishCompressed:
                buffer = Buffer.alloc(29);
                buffer.writeUInt8(this.message.header.messageType, 0);
                buffer.write(this.message.header.topicID, 1, 21, 'utf-8');
                buffer.writeUInt32BE((this.message.header as ProtocolTypes.PublishHeader).i, 21);
                buffer.writeUInt32BE((this.message.header as ProtocolTypes.PublishHeader).n, 25);
                break;
            case ProtocolTypes.MessageType.Message:
                buffer = Buffer.alloc(21);
                buffer.writeUInt8(this.message.header.messageType, 0);
                buffer.write(this.message.header.topicID, 1, 20, 'utf-8');
                break;
            default:
                buffer = Buffer.alloc(1);
                buffer.writeUInt8(this.message.header.messageType, 0);
                break;
        }

        // Append payloads only for specific message types
        if ([ProtocolTypes.MessageType.RegisterResponse,
        ProtocolTypes.MessageType.ListResponse,
        ProtocolTypes.MessageType.RegisterError,
        ProtocolTypes.MessageType.ListError,
        ProtocolTypes.MessageType.AnnounceError,
        ProtocolTypes.MessageType.SubscribeError,
        ProtocolTypes.MessageType.Subscribe,
        ProtocolTypes.MessageType.UnsubscribeError,
        ProtocolTypes.MessageType.Unsubscribe,
        ProtocolTypes.MessageType.PublishError,
        ProtocolTypes.MessageType.PublishCompressedError,
        ProtocolTypes.MessageType.MessageError,
        ProtocolTypes.MessageType.Message,
        ProtocolTypes.MessageType.AnnounceResponse,
        ProtocolTypes.MessageType.Announce].includes(this.message.header.messageType)) {
            const jsonBuffer = Buffer.from(JSON.stringify(this.message.payload), 'utf-8');
            const combinedBuffer = Buffer.alloc(buffer.length + jsonBuffer.length);
            buffer.copy(combinedBuffer, 0);
            jsonBuffer.copy(combinedBuffer, buffer.length);
            buffer = combinedBuffer;
        } else if (this.message.header.messageType === ProtocolTypes.MessageType.Publish || 
                   this.message.header.messageType === ProtocolTypes.MessageType.PublishCompressed) {
            const payloadBuffer = this.message.payload as Buffer;
            const combinedBuffer = Buffer.alloc(buffer.length + payloadBuffer.length);
            buffer.copy(combinedBuffer, 0);
            payloadBuffer.copy(combinedBuffer, buffer.length);
            buffer = combinedBuffer;
        }

        return buffer;
    }
}
