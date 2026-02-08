
/**
 * Akashic Records Storage System
 * Shared storage for all Mystic Matrix apps
 */

const AKASHIC_KEY = 'mystic_matrix_records';

const Akashic = {
    // Save a new record
    save: (record) => {
        // Record structure:
        // {
        //   id: uuid,
        //   timestamp: ISOString,
        //   type: 'tarot' | 'iching' | 'palmistry' | 'face' | 'astro',
        //   summary: string, (short description)
        //   fullContent: string, (markdown or html)
        //   meta: object (specific data like card list, hexagram code, etc.)
        // }
        
        const records = Akashic.getAll();
        const newRecord = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            ...record
        };
        records.push(newRecord);
        localStorage.setItem(AKASHIC_KEY, JSON.stringify(records));
        console.log(`[Akashic] Saved record: ${newRecord.type} at ${newRecord.timestamp}`);
        return newRecord;
    },

    // Get all records
    getAll: () => {
        const raw = localStorage.getItem(AKASHIC_KEY);
        return raw ? JSON.parse(raw) : [];
    },

    // Get records by date range (start/end are Date objects or ISO strings)
    getByDate: (dateStr) => {
        // Simple day matching YYYY-MM-DD
        const target = dateStr.split('T')[0];
        return Akashic.getAll().filter(r => r.timestamp.startsWith(target));
    },

    // Clear all
    clear: () => {
        localStorage.removeItem(AKASHIC_KEY);
    },
    
    // Delete one
    delete: (id) => {
        const records = Akashic.getAll().filter(r => r.id !== id);
        localStorage.setItem(AKASHIC_KEY, JSON.stringify(records));
    }
};

// Export to window
window.Akashic = Akashic;
