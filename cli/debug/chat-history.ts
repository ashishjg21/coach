import { Command } from 'commander'
import chalk from 'chalk'
import { prisma } from '../../server/utils/db'
import { transformHistoryToCoreMessages } from '../../server/utils/ai-history'

const chatHistoryCommand = new Command('chat-history')
  .description('Validate chat history transformation for recent rooms')
  .option('-l, --limit <number>', 'Number of recent rooms to check', '20')
  .option('-r, --roomId <string>', 'Check a specific room ID')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Validating chat history consistency...'))

      let rooms: { id: string; name: string | null; createdAt: Date }[] = []

      if (options.roomId) {
        const room = await prisma.chatRoom.findUnique({
          where: { id: options.roomId },
          select: { id: true, name: true, createdAt: true }
        })
        if (room) rooms = [room]
      } else {
        rooms = await prisma.chatRoom.findMany({
          orderBy: { createdAt: 'desc' },
          take: parseInt(options.limit),
          select: { id: true, name: true, createdAt: true }
        })
      }

      if (rooms.length === 0) {
        console.log(chalk.yellow('No chat rooms found.'))
        return
      }

      console.log(`Checking ${rooms.length} rooms...\n`)

      let validRooms = 0
      let invalidRooms = 0

      for (const room of rooms) {
        const messages = await prisma.chatMessage.findMany({
          where: { roomId: room.id },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
            metadata: true
          }
        })

        if (messages.length === 0) {
          console.log(chalk.gray(`[${room.id}] Empty room, skipping.`))
          continue
        }

        // Map to format expected by transformHistoryToCoreMessages (simulating API get)
        const historyMessages = messages.map((msg) => {
          const parts: any[] = []
          if (msg.content || msg.senderId === 'ai_agent') {
            parts.push({ type: 'text', text: msg.content || ' ' })
          }
          const metadata = (msg.metadata as any) || {}

          if (metadata.toolApprovals && Array.isArray(metadata.toolApprovals)) {
            metadata.toolApprovals.forEach((approval: any) => {
              parts.push({
                type: 'tool-approval-request',
                approvalId: approval.approvalId || approval.toolCallId,
                toolCallId: approval.toolCallId,
                toolCall: {
                  toolName: approval.name,
                  args: approval.args,
                  toolCallId: approval.toolCallId
                }
              })
            })
          }

          // Add tool invocation parts (completed tools)
          if (metadata.toolCalls && Array.isArray(metadata.toolCalls)) {
            metadata.toolCalls.forEach((tc: any, index: number) => {
              parts.push({
                type: 'tool-invocation',
                toolCallId: tc.toolCallId || `call-${msg.id}-${index}`,
                toolName: tc.name,
                args: tc.args,
                state: 'result',
                result: tc.response
              })
            })
          }

          // Add tool response (if it's a tool message)
          if (metadata.toolResponse && Array.isArray(metadata.toolResponse)) {
            metadata.toolResponse.forEach((part: any) => {
              parts.push(part)
            })
          }

          return {
            id: msg.id,
            role:
              msg.senderId === 'ai_agent'
                ? 'assistant'
                : msg.senderId === 'system_tool'
                  ? 'tool'
                  : 'user',
            content: msg.content,
            parts,
            metadata: {
              ...metadata,
              createdAt: msg.createdAt
            }
          }
        })

        try {
          const coreMessages = await transformHistoryToCoreMessages(historyMessages)
          const errors: string[] = []

          // --- VALIDATION RULES ---

          // 1. Check Roles
          coreMessages.forEach((m, i) => {
            if (!['user', 'model', 'tool'].includes(m.role)) {
              errors.push(`Msg ${i}: Invalid role '${m.role}'`)
            }
          })

          // 2. Check Empty Content
          coreMessages.forEach((m, i) => {
            if (m.role === 'model') {
              if (!m.content) {
                errors.push(`Msg ${i} (model): Content is undefined/null`)
              } else if (Array.isArray(m.content) && m.content.length === 0) {
                errors.push(`Msg ${i} (model): Content is empty array`)
              } else if (typeof m.content === 'string' && m.content.trim() === '') {
                // String content being empty is sometimes allowed if tool calls exist,
                // but our transformer converts to array if tool calls exist.
                // If it's just empty string, it might be an issue.
                // errors.push(`Msg ${i} (model): Content is empty string`)
              }
            }
          })

          // 3. Check Tool Call/Result Pairing
          const toolCalls = new Set<string>()
          const toolResults = new Set<string>()

          coreMessages.forEach((m) => {
            if (Array.isArray(m.content)) {
              m.content.forEach((part: any) => {
                if (part.type === 'tool-call') {
                  toolCalls.add(part.toolCallId)
                }
                if (part.type === 'tool-result') {
                  toolResults.add(part.toolCallId)
                }
              })
            }
          })

          // Check for dangling calls (Call without Result) - STRICT ERROR for Gemini
          toolCalls.forEach((id) => {
            if (!toolResults.has(id)) {
              errors.push(`Dangling Tool Call: ${id} (No result found)`)
            }
          })

          // Check for dangling results (Result without Call) - STRICT ERROR for Gemini
          toolResults.forEach((id) => {
            if (!toolCalls.has(id)) {
              errors.push(`Dangling Tool Result: ${id} (No call found)`)
            }
          })

          if (errors.length > 0) {
            console.log(chalk.red(`❌ [${room.name || 'Untitled'}] (${room.id})`))
            errors.forEach((e) => console.log(chalk.red(`   - ${e}`)))
            invalidRooms++
          } else {
            console.log(chalk.green(`✅ [${room.name || 'Untitled'}] (${room.id})`))
            validRooms++
          }
        } catch (error: any) {
          console.log(
            chalk.red(`🔥 [${room.name || 'Untitled'}] (${room.id}) - Transformation Failed`)
          )
          console.log(chalk.red(`   - ${error.message}))`))
          invalidRooms++
        }
      }

      console.log('\n' + chalk.bold('Summary:'))
      console.log(`Total Checked: ${rooms.length}`)
      console.log(chalk.green(`Valid: ${validRooms}`))
      console.log(chalk.red(`Invalid: ${invalidRooms}`))
    } catch (error: any) {
      console.error(chalk.red('Fatal error:'), error)
    } finally {
      await prisma.$disconnect()
    }
  })

export default chatHistoryCommand
