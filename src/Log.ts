class Log {
    private static debugMode: boolean = false;

    // Static method to set debug mode
    static setDebugMode(debug: boolean) {
        this.debugMode = debug;
    }

    static error(message: string) {
        console.error('\x1b[31m%s\x1b[0m', '❌ ' + message);
    }

    static success(message: string) {
        console.log('✅ ' + message);
    }

    static message(message: string, emoji: string = '💬') {
        console.log(emoji + ' ' + message);
    }

    static table(map: Map<any, any>) {
        console.table(map);
    }

    static info(message: string) {
        console.log('ℹ️ ' + message);
    }

    static warning(message: string) {
        console.warn('⚠️ ' + message);
    }

    static debug(message: string) {
        if (this.debugMode) { // Only log debug messages when debugMode is true
            console.log('🐞 ' + message);
        }
    }
}

export { Log };
