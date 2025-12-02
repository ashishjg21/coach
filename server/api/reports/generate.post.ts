import { getServerSession } from '#auth'
import { tasks } from "@trigger.dev/sdk/v3";

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const userId = (session.user as any).id
  
  // Create report record
  const report = await prisma.report.create({
    data: {
      userId,
      type: 'WEEKLY_ANALYSIS',
      status: 'PENDING',
      dateRangeStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateRangeEnd: new Date()
    }
  })
  
  try {
    // Trigger background job
    const handle = await tasks.trigger('generate-weekly-report', {
      userId,
      reportId: report.id
    })
    
    return {
      success: true,
      reportId: report.id,
      jobId: handle.id,
      message: 'Report generation started'
    }
  } catch (error) {
    // Update report status to failed
    await prisma.report.update({
      where: { id: report.id },
      data: { status: 'FAILED' }
    })
    
    throw createError({
      statusCode: 500,
      message: `Failed to trigger report generation: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})