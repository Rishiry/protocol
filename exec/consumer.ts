import { Consumer } from "../src/Actor";
import * as ProtocolTypes from '../types/Protocol';
import readline from 'readline';

const actor = new Consumer();
actor.register(ProtocolTypes.Role.Consumer).then(clientId => {
    console.log(`🆔 Registered with ID: ${clientId}`);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Instructions for user
const displayInstructions = () => {
    console.log('🎮  Commands Menu:');
    console.log('\t1️  ➜ List Topics');
    console.log('\t2  ➜ Subscribe to Topic');
    console.log('\t3  ➜ Unsubscribe from Topic');
    console.log('\tq  ➜ Quit\n');
};


displayInstructions();

rl.on('line', (input) => {
    switch (input) {
        case '1':
            actor.list();
            console.log('📜 Listed topics!');
            break;
        case '2':
            rl.question('📬 Enter topic ID to subscribe: ', (topicId) => {
                actor.subscribe(topicId);
            });
            break;
        case '3':
            rl.question('🚫 Enter topic ID to unsubscribe: ', (topicId) => {
                actor.unsubscribe(topicId);
            });
            break;
        case 'q':
            console.log('👋 Goodbye!');
            rl.close();
            break;
        default:
            console.log('❗ Unknown command. Try again.');
            break;
    }
});