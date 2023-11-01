import * as udp from 'dgram';

/**
 * The Server class handles the creation and management of a UDP server.
 */
class Server {
    private server: udp.Socket;

    constructor() {
        this.server = udp.createSocket('udp4');
    }

    /**
     * Starts the server on the specified port.
     * @param port - Port number to start the server on.
     */
    start(port: number) {
        // Attach error handler
        this.server.on('error', (error) => {
            console.error('Server Error:', error);
            this.server.close();
        });

        // Log server details once it starts listening
        this.server.on('listening', () => {
            const address = this.server.address();
            console.log(`Server is listening at port ${address.port}`);
            console.log(`Server IP: ${address.address}`);
            console.log(`Server is IP4/IP6 : ${address.family}`);
        });

        // Bind the server to the specified port
        this.server.bind(port);
    }

    /**
     * Sends a message to a specific host and port.
     * @param message - The message to be sent.
     * @param port - The destination port.
     * @param host - The destination host.
     */
    send(message: Buffer, port: number, host: string) {
        this.server.send(message, port, host, (error) => {
            if (error) {
                console.error('Error sending message:', error);
            }
        });
    }

    /**
     * Setup a callback to handle received messages.
     * @param callback - The callback to handle messages.
     */
    receive(callback: (msg: Buffer, info: udp.RemoteInfo) => void) {
        this.server.on('message', callback);
    }
}

/**
 * The Client class handles the creation and management of a UDP client.
 */
class Client {
    private client: udp.Socket;

    constructor() {
        this.client = udp.createSocket('udp4');
    }

    /**
     * Start the client and attach necessary handlers.
     */
    start() {
        this.client.on('error', (error) => {
            console.error('Client Error:', error);
            this.reconnect();
        });
    }

    /**
     * Sends a message to a specific host and port.
     * @param message - The message to be sent.
     * @param port - The destination port. Default is 2222.
     * @param host - The destination host. Default is 'localhost'.
     */
    send(message: Buffer, port: number = 2222, host: string = 'localhost') {
        this.client.send(message, port, host, (error) => {
            if (error) {
                console.error('Error sending message:', error);
                this.client.close();
            }
        });
    }

    /**
     * Setup a callback to handle received messages.
     * @param callback - The callback to handle messages.
     */
    receive(callback: (msg: Buffer, info: udp.RemoteInfo) => void) {
        this.client.on('message', callback);
    }

    /**
     * Disconnect the client and attempt to reconnect.
     */
    disconnect() {
        this.client.close();
        this.reconnect();
    }

    /**
     * Attempt to reconnect the client after a delay.
     */
    private reconnect() {
        setTimeout(() => {
            console.log('Trying to reconnect...');
            this.client = udp.createSocket('udp4');
            this.start();
        }, 5000);
    }
}

export { Server, Client };
