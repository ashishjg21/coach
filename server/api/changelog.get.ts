import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async () => {
  try {
    const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md')
    const content = await fs.readFile(changelogPath, 'utf-8')
    return { content }
  } catch (error) {
    // If file doesn't exist yet, return empty content
    return { content: '# Changelog\n\nNo releases yet.' }
  }
})
