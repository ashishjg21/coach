import { getServerSession } from '../../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Chat'],
    summary: 'Delete a chat room (soft delete)',
    description: 'Marks a chat room as deleted for the authenticated user.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' },
      404: { description: 'Not Found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const roomId = getRouterParam(event, 'id')

  if (!roomId) {
    throw createError({ statusCode: 400, message: 'Room ID is required' })
  }

  // Check if the user is a participant in the room
  const participant = await prisma.chatParticipant.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId
      }
    }
  })

  if (!participant) {
    throw createError({ statusCode: 404, message: 'Room not found or access denied' })
  }

  // Soft delete the room
  await prisma.chatRoom.update({
    where: { id: roomId },
    data: { deletedAt: new Date() }
  })

  return { success: true }
})
