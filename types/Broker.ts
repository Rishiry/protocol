import {Role} from './Protocol';
import * as udp from 'dgram';

export type Client = {
    role: Role;
    id: string;
    info: udp.RemoteInfo;
};

export type Topic = {
    producerId: string;
    description: string;
    allowMessaging: boolean;
    subscribers: string[];
    i: number;
};