import { Protocol } from './Protocol'; // Adjust the path if needed
import * as ProtocolTypes from '../types/Protocol';
import { Buffer } from 'buffer';

describe('Protocol', () => {
    it('should encode and decode Register message correctly', () => {
        const protocol = new Protocol({
            header: {
                messageType: ProtocolTypes.MessageType.Register,
                role: ProtocolTypes.Role.Producer
            },
            payload: null
        });

        const encoded = protocol.encode();
        const decodedProtocol = Protocol.decode(encoded);

        expect(decodedProtocol.message.header.messageType).toBe(ProtocolTypes.MessageType.Register);
        expect((decodedProtocol.message.header as ProtocolTypes.RegisterHeader).role).toBe(ProtocolTypes.Role.Producer);
    });

    it('should encode and decode BrokerOK message correctly', () => {
        const protocol = new Protocol({
            header: {
                messageType: ProtocolTypes.MessageType.BrokerOK
            },
            payload: {
                message: "Everything is fine",
                data: "Sample data"
            }
        });

        const encoded = protocol.encode();
        const decodedProtocol = Protocol.decode(encoded);

        expect(decodedProtocol.message.header.messageType).toBe(ProtocolTypes.MessageType.BrokerOK);
        expect((decodedProtocol.message.payload as ProtocolTypes.BrokerOKPayload).message).toBe("Everything is fine");
    });

    it('should encode and decode BrokerError message correctly', () => {
        const protocol = new Protocol({
            header: {
                messageType: ProtocolTypes.MessageType.BrokerError
            },
            payload: {
                error: "Something went wrong"
            }
        });

        const encoded = protocol.encode();
        const decodedProtocol = Protocol.decode(encoded);

        expect(decodedProtocol.message.header.messageType).toBe(ProtocolTypes.MessageType.BrokerError);
        expect((decodedProtocol.message.payload as ProtocolTypes.BrokerErrorPayload).error).toBe("Something went wrong");
    });

    it('should encode and decode Announce message correctly', () => {
        const protocol = new Protocol({
            header: {
                messageType: ProtocolTypes.MessageType.Announce
            },
            payload: {
                topicID: "HELLO",
                description: "Sample description",
                allowMessaging: true
            }
        });

        const encoded = protocol.encode();
        const decodedProtocol = Protocol.decode(encoded);

        expect(decodedProtocol.message.header.messageType).toBe(ProtocolTypes.MessageType.Announce);
        expect((decodedProtocol.message.payload as ProtocolTypes.AnnouncePayload).topicID).toBe("HELLO");
    });

});

