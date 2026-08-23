import EventEmitter from 'events'

export async function register() {
    // Augmenter la limite pour eviter MaxListenersExceededWarning (Gzip SSR)
    EventEmitter.defaultMaxListeners = 30
}

