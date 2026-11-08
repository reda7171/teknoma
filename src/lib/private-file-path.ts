import 'server-only'
import { resolve, relative, isAbsolute } from 'node:path'

export function privateFilePath(root: string, filename: string) {
    if (!filename || filename === '.' || filename === '..' || /[\/\\\x00-\x1f]/.test(filename)) return null
    const base = resolve(root), target = resolve(base, filename)
    const rel = relative(base, target)
    return !rel || rel.startsWith('..') || isAbsolute(rel) ? null : target
}
