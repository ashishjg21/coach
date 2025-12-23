import { H3Event, getCookie } from 'h3'
import { getServerSession as getBaseSession } from '#auth'

/**
 * Centralized session utility that handles regular authentication
 * and admin impersonation.
 */
export async function getServerSession(event: H3Event) {
  // 1. Check for standard auth session
  const session = await getBaseSession(event)

  // 2. Handle Admin Impersonation
  const impersonatedUserId = getCookie(event, 'auth.impersonated_user_id')
  
  if (session?.user && (session.user as any).isAdmin && impersonatedUserId) {
    // If user is admin and requesting impersonation, fetch the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: impersonatedUserId }
    })

    if (targetUser) {
      return {
        ...session,
        user: {
          ...session.user,
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          image: targetUser.image,
          isAdmin: (targetUser as any).isAdmin || false,
          isImpersonating: true,
          originalUserId: (session.user as any).id,
          originalUserEmail: session.user.email
        }
      }
    }
  }

  return session
}
