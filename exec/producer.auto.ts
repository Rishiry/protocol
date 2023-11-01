import { Producer } from "../src/Actor";
import * as ProtocolTypes from '../types/Protocol';
import readline from 'readline';
import * as fs from 'fs';

const actor = new Producer();
actor.register(ProtocolTypes.Role.Producer);

const publishImage = () => {
    // Read 'Creative.JPG' as a buffer
    const image = fs.readFileSync('./Creative.JPG');

        actor.publish(actor.clientId + 'hi', 1, image, false);
        
        console.log('🚀 Image Published!');
};


// Introduce a delay of 2 seconds (2000 milliseconds) before announcing
setTimeout(() => {
    actor.announce('hi', false, 'hello');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    
    setTimeout(()=> publishImage(), 500)

}, 1000); // Delay of 2000 milliseconds
