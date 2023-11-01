import { Server } from './Network';
import { Protocol } from './Protocol'
import { Log } from './Log';

import * as ProtocolTypes from '../types/Protocol';
import { Client, Topic } from '../types/Broker';

import * as udp from 'dgram';

class Broker {
    private server: Server;
    private clients: { [address: string]: Client };
    private topics: { [topicId: string]: Topic };

    constructor() {
        this.server = new Server();
        this.clients = {};  // Initialized as an empty object.
        this.topics = {};   // Initialized as an empty object.
    }

    run() {
        this.server.start(2222);
        this.server.receive((msg, info) => {
            const message = Protocol.decode(msg);
            switch (message.message.header.messageType) {
                case ProtocolTypes.MessageType.Register:
                    this.handleRegister(message, info);
                    break;
                case ProtocolTypes.MessageType.List:
                    this.handleList(info);
                    break;
                case ProtocolTypes.MessageType.Announce:
                    this.handleAnnounce(message, info);
                    break;

                case ProtocolTypes.MessageType.Subscribe:
                    this.handleSubscribe(message, info);
                    break;
                case ProtocolTypes.MessageType.Unsubscribe:
                    this.handleUnsubscribe(message, info);
                    break;
                case ProtocolTypes.MessageType.Publish:
                case ProtocolTypes.MessageType.PublishCompressed:
                    this.handlePublish(message, info);
                    break;
                default:
                    break;
            }
        });
    }

    private handleRegister(message: Protocol, info: udp.RemoteInfo) {
        const role = (message.message.header as ProtocolTypes.RegisterHeader).role;
        const clientId = this.generateClientId();
        this.clients[`${info.address}:${info.port}`] = { role, id: clientId, info };
        this.server.send(new Protocol({ header: { messageType: ProtocolTypes.MessageType.RegisterResponse }, payload: { clientID: clientId } }).encode(), info.port, info.address);
        Log.message("Registered a New " + role + ": " + clientId, '🤖')
    }

    private handleList(info: udp.RemoteInfo) {
        const topicList = Object.entries(this.topics).map(([topicID, topic]) => ({
            topicID,
            description: topic.description,
            allowMessaging: topic.allowMessaging
        }));
        
        this.server.send(new Protocol({ header: { messageType: ProtocolTypes.MessageType.ListResponse }, payload: { topics: JSON.stringify(topicList) } }).encode(), info.port, info.address);
        Log.message("List of Topics Sent", '📜')
    }

    private handleAnnounce(message: Protocol, info: udp.RemoteInfo) {
        const payload = message.message.payload as ProtocolTypes.AnnouncePayload
        const topicId = payload.topicID;
        const clientId = this.clients[(`${info.address}:${info.port}`)]?.id;

        if (!clientId || this.clients[`${info.address}:${info.port}`]?.role !== ProtocolTypes.Role.Producer) {
            this.server.send(new Protocol({ header: { messageType: ProtocolTypes.MessageType.AnnounceError }, payload: { error: 'Only producers can announce topics.' } }).encode(), info.port, info.address);
            return;
        }

        const fullTopicId = (clientId+topicId).normalize('NFC')

        if (this.topics[fullTopicId]) {
            this.server.send(new Protocol({ header: { messageType: ProtocolTypes.MessageType.AnnounceError }, payload: { error: 'Topic already exists.' } }).encode(), info.port, info.address);
            return;
        }
        this.topics[fullTopicId] = { producerId: clientId, subscribers: [], description: payload.description, allowMessaging: payload.allowMessaging, i: 0 };

        this.server.send(new Protocol({ header: { messageType: ProtocolTypes.MessageType.AnnounceResponse }, payload: { topicID: fullTopicId } }).encode(), info.port, info.address);
        Log.message("New Topic Announced: " + fullTopicId, '📢')
    }

    private handleSubscribe(message: Protocol, info: udp.RemoteInfo) {
        const topicId = (message.message.payload as ProtocolTypes.SubscribeUnsubscribePayload).topicID.normalize('NFC');
        const clientId = this.clients[(`${info.address}:${info.port}`)]?.id;

        // Check if client exists and is a Consumer
        if (!clientId || this.clients[(`${info.address}:${info.port}`)]?.role !== ProtocolTypes.Role.Consumer) {
            this.server.send(new Protocol({
                header: { messageType: ProtocolTypes.MessageType.SubscribeError },
                payload: { error: 'Only consumers can subscribe to topics.' }
            }).encode(), info.port, info.address);
            return;
        }

        // Check if topic exists
        if (!this.topics[topicId]) {
            this.server.send(new Protocol({
                header: { messageType: ProtocolTypes.MessageType.SubscribeError },
                payload: { error: 'Topic does not exist.' }
            }).encode(), info.port, info.address);
            return;
        }

        // Subscribe the client
        const topic = this.topics[topicId];
        if (topic && !topic.subscribers.includes(clientId)) {
            topic.subscribers.push(clientId);
        }

        this.server.send(new Protocol({
            header: { messageType: ProtocolTypes.MessageType.SubscribeResponse },
            payload: null
        }).encode(), info.port, info.address);
        Log.message("Client Subscribed to Topic: " + topicId, '📬');
    }

    private handleUnsubscribe(message: Protocol, info: udp.RemoteInfo) {
        const topicId = (message.message.payload as ProtocolTypes.SubscribeUnsubscribePayload).topicID.normalize('NFC');
        const clientId = this.clients[(`${info.address}:${info.port}`)]?.id

        // Check if client exists and is a Consumer
        if (!clientId || this.clients[(`${info.address}:${info.port}`)]?.role !== ProtocolTypes.Role.Consumer) {
            this.server.send(new Protocol({
                header: { messageType: ProtocolTypes.MessageType.UnsubscribeError },
                payload: { error: 'Only consumers can unsubscribe from topics.' }
            }).encode(), info.port, info.address);
            return;
        }

        // Check if topic exists
        if (!this.topics[topicId]) {
            this.server.send(new Protocol({
                header: { messageType: ProtocolTypes.MessageType.UnsubscribeError },
                payload: { error: 'Topic does not exist.' }
            }).encode(), info.port, info.address);
            return;
        }

        // Unsubscribe the client
        const topic = this.topics[topicId];
        if (topic) {
            const index = topic.subscribers.indexOf(clientId);
            if (index > -1) {
                topic.subscribers.splice(index, 1);
            }
        }

        this.server.send(new Protocol({
            header: { messageType: ProtocolTypes.MessageType.UnsubscribeResponse },
            payload: null
        }).encode(), info.port, info.address);
        Log.message("Client Unsubscribed from Topic: " + topicId, '🚫');
    }

    private handlePublish(message: Protocol, info: udp.RemoteInfo) {
        const payload = message.message.payload as Buffer;
        const header = message.message.header as ProtocolTypes.PublishHeader
        const clientId = this.clients[(`${info.address}:${info.port}`)]?.id;
        const topicId = header.topicID.replace(/\0/g, '').normalize('NFC');

        // Check if client exists
        if (!clientId) {
            this.server.send(new Protocol({
                header: { messageType: ProtocolTypes.MessageType.PublishError },
                payload: { error: 'Client not found.' }
            }).encode(), info.port, info.address);
            return;
        }

        const topic = this.topics[topicId]
  
        
        if (!this.topics[topicId]) {

            this.server.send(new Protocol({
                header: { messageType: ProtocolTypes.MessageType.PublishError },
                payload: { error: 'Unable to fetch topic' }
            }).encode(), info.port, info.address);
            return;
        }

        
        if (topic.producerId != clientId) {
            this.server.send(new Protocol({
                header: { messageType: ProtocolTypes.MessageType.PublishError },
                payload: { error: 'You are not the owner of this topic. It belongs to' + topic.producerId }
            }).encode(), info.port, info.address);
            return;
        }

        if (this.topics[topicId].i < header.i) {
            Log.message("Published to Topic " + header.topicID + " Iteration " + String(header.i), '💌');
            this.topics[topicId].i = header.i
        }

        if (topic) {
            topic.subscribers.forEach(subscriberId => {
                // Assuming you have a mapping of client ID to their RemoteInfo somewhere
                const subscriberInfo = this.getClientInfoById(subscriberId);
                if (subscriberInfo) {
                    this.server.send(message.encode(), subscriberInfo.port, subscriberInfo.address);
                }
            });
        }

        // Respond to the publisher that the message has been sent
        this.server.send(new Protocol({
            header: { messageType: ProtocolTypes.MessageType.PublishResponse },
            payload: null
        }).encode(), info.port, info.address);
    }

    // A helper method to get client info by their ID
    // You might need to modify the ClientMap type and its usages elsewhere in the code
    private getClientInfoById(clientId: string): udp.RemoteInfo | null {
        for (const client of Object.values(this.clients)) {
            if (client.id === clientId) {
                return client.info;
            }
        }
        return null;
    }
    
    private generateClientId(): string {
        const emojis = ['😀', '🎉', '❤️', '🚀', '🌙', '🍕', '🐱', '📚', '🔥'];
        let id = '';

        id += emojis[Math.floor(Math.random() * emojis.length)];
        id += emojis[Math.floor(Math.random() * emojis.length)];
        id += emojis[Math.floor(Math.random() * emojis.length)];

        return id;
    }
}

export { Broker };
