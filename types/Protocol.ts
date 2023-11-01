export enum MessageType {
    Register = 0x00,
    List = 0x01,
    Announce = 0x02,
    Subscribe = 0x03,
    Unsubscribe = 0x04,
    Publish = 0x05,
    PublishCompressed = 0x06,
    Message = 0x07,

    RegisterResponse = 0x10,
    ListResponse = 0x11,
    AnnounceResponse = 0x12,
    SubscribeResponse = 0x13,
    UnsubscribeResponse = 0x14,
    PublishResponse = 0x15,
    PublishCompressedResponse = 0x16,
    MessageResponse = 0x17,

    RegisterError = 0x20,
    ListError = 0x21,
    AnnounceError = 0x22,
    SubscribeError = 0x23,
    UnsubscribeError = 0x24,
    PublishError = 0x25,
    PublishCompressedError = 0x26,
    MessageError = 0x27,

}

export enum Role {
    Consumer = 0x00,
    Producer = 0x01
}

export interface ResponseHeader {
    messageType: 
        MessageType.RegisterResponse |
        MessageType.ListResponse |
        MessageType.AnnounceResponse |
        MessageType.SubscribeResponse |
        MessageType.UnsubscribeResponse |
        MessageType.PublishResponse |
        MessageType.PublishCompressedResponse |
        MessageType.MessageResponse;
}

export interface ErrorHeader {
    messageType: 
        MessageType.RegisterError |
        MessageType.ListError |
        MessageType.AnnounceError |
        MessageType.SubscribeError |
        MessageType.UnsubscribeError |
        MessageType.PublishError |
        MessageType.PublishCompressedError |
        MessageType.MessageError;
}

export interface RegisterHeader {
    messageType: MessageType.Register;              // 1 Byte
    role: Role;                                     // 1 Byte
}

export interface ListHeader {
    messageType: MessageType.List;                  // 1 Byte
}

export interface AnnounceHeader {
    messageType: MessageType.Announce;              // 1 Byte
}

export interface SubscribeHeader {
    messageType: MessageType.Subscribe;             // 1 Byte
}

export interface UnsubscribeHeader {
    messageType: MessageType.Unsubscribe;           // 1 Byte
}

export interface PublishHeader {
    messageType: MessageType.Publish | MessageType.PublishCompressed;           // 1 Byte
    topicID: string;                                // 20 Bytes
    i: number;                                      // 4 Bytes
    n: number;                                      // 4 Bytes
}

export interface MessageHeader {
    messageType: MessageType.Message;               // 1 Byte
    topicID: string;                                // 20 Bytes
}

export type Header = ResponseHeader | ErrorHeader | RegisterHeader | ListHeader | AnnounceHeader | SubscribeHeader | UnsubscribeHeader | PublishHeader | MessageHeader;


export interface RegisterResponsePayload {
    clientID: string
}

export interface ListResponsePayload {
    topics: string
}

export interface ErrorPayload {
    error: string;
}

export interface MessagePayload {
    message: string;
}

export interface AnnouncePayload {
    topicID: string;
    description: string;
    allowMessaging: boolean;
}

export interface AnnounceResponsePayload {
    topicID: string;
}

export interface SubscribeUnsubscribePayload {
    topicID: string;
}

export type Payload = ErrorPayload | ListResponsePayload | RegisterResponsePayload | AnnouncePayload | MessagePayload | SubscribeUnsubscribePayload | Buffer | null;

export interface ProtocolMessage {
    header: Header;
    payload: Payload;
}