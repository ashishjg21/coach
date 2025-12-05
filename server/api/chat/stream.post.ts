import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText } from 'ai'
import { google } from '@ai-sdk/google'
import type { UIMessage } from 'ai'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const { messages } = await readValidatedBody(event, z.object({
    messages: z.array(z.custom<UIMessage>())
  }).parse)

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      // Use Gemini Flash for fast, cost-effective responses
      const result = streamText({
        model: google('gemini-2.0-flash-exp'),
        system: `You are an AI-powered cycling coach with deep expertise in training, nutrition, recovery, and performance optimization. 

Your role is to:
- Provide personalized coaching advice based on training data
- Analyze workout patterns and suggest improvements
- Give guidance on recovery, nutrition, and training load
- Help athletes understand their metrics (power, heart rate, TSS, etc.)
- Offer encouragement and motivation
- Answer questions about cycling training, physiology, and best practices

**FORMATTING RULES:**
- Use **bold text** for emphasis and section labels
- Keep responses clear, concise, and actionable
- Use bullet points for lists
- Break down complex concepts into digestible parts
- Maintain a supportive, professional coaching tone

**RESPONSE QUALITY:**
- Be specific and practical
- Use examples when helpful
- Reference relevant metrics and data when available
- Provide explanations that help athletes understand the "why" behind recommendations`,
        messages: convertToModelMessages(messages)
      })

      writer.merge(result.toUIMessageStream())
    }
  })

  return createUIMessageStreamResponse({
    stream
  })
})