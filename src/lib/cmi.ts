import crypto from 'crypto';

/**
 * Generate CMI SHA-512 Hash
 * @param params Object containing all parameters sent to CMI except the 'HASH' parameter
 * @param storeKey The CMI Store Key
 * @returns Base64 encoded SHA-512 hash
 */
export function generateCMIHash(params: Record<string, string>, storeKey: string): string {
    // 1. Sort the keys alphabetically (case insensitive, but standard JS sort is enough usually, CMI docs specify alphabetical sort of keys)
    const sortedKeys = Object.keys(params).sort((a, b) => {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    let hashString = '';
    // 2. Concatenate the values of sorted keys. Note: CMI replaces some special chars if necessary, but standard string concat with | is required
    for (const key of sortedKeys) {
        if (key !== 'HASH' && key !== 'encoding') {
            const value = params[key];
            if (value !== undefined && value !== null && value !== '') {
                // Escape pipe characters and backslashes in values
                const escapedValue = String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
                hashString += escapedValue + '|';
            }
        }
    }

    // 3. Append StoreKey
    hashString += storeKey;

    // 4. Generate SHA-512 Hash and encode in Base64
    const hash = crypto.createHash('sha512').update(hashString, 'utf-8').digest('base64');
    
    return hash;
}
