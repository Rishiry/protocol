import { Producer } from "../src/Actor";
import * as ProtocolTypes from '../types/Protocol';

import readline from 'readline';

import * as fs from 'fs';
import * as path from 'path';


const actor = new Producer();
actor.register(ProtocolTypes.Role.Producer);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Instructions for user
const displayMenu = () => {
    console.log('🎮  Commands Menu:');
    console.log('\t1  ➜ Announce');
    console.log('\t2  ➜ Publish\n');
    console.log('\tq  ➜ Quit\n');
};

const promptForAnnouncementDetails = () => {
    rl.question('🆔 Enter the 2-char ID: ', (id) => {
        if (id.length !== 2) {
            console.log('❌ ID must be 2 characters.');
            return displayMenu();
        }

        rl.question('📨 Messaging allowed? (y/n): ', (allowed) => {
            const messagingAllowed = (allowed.toLowerCase() === 'y');

            rl.question('📝 Enter a description: ', (description) => {
                actor.announce(id, messagingAllowed, description);

            });
        });
    });
};

const promptForPublishDetails = () => {
    rl.question('📂 Enter the path to the folder: ', (folderPath) => {

        if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
            console.log('❌ Folder does not exist or is not a directory.');
            return displayMenu();
        }

        // Get all PNG files from the directory
        const pngFiles = fs.readdirSync(folderPath)
            .filter(file => path.extname(file).toLowerCase() === '.png')
            .sort((a, b) => {
                const numA = parseInt(a.split('.')[0], 10);
                const numB = parseInt(b.split('.')[0], 10);
                return numA - numB;
            });

        if (pngFiles.length === 0) {
            console.log('❌ No PNG files found in the directory.');
            return displayMenu();
        }

        rl.question('🆔 Enter the topic ID: ', (topicID) => {
            rl.question('🗜 Compressed? (y/n): ', (compressChoice) => {
                    const compress = compressChoice.toLowerCase() === 'y';

                    pngFiles.forEach(async (file, index) => {
                        const filePath = path.join(folderPath, file);
                        const fileBuffer = fs.readFileSync(filePath);
                        console.log(`📤 Publishing file ${index + 1}/${pngFiles.length}: ${file}`);
                        actor.publish(topicID, index + 1, fileBuffer, compress);

                     
                    });

                    displayMenu();
            });
        });
    });
};

displayMenu();

rl.on('line', (input) => {
    switch (input) {
        case '1':
            promptForAnnouncementDetails();
            break;
        case '2':
            promptForPublishDetails();
            break;
        case 'q':
            console.log('👋 Goodbye!');
            rl.close();
            return;
        default:
            console.log('❌ Unknown command. Try again.');
            break;
    }
});
