import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { question, userAnswer, correctAnswer, topicName, subjectName } = await request.json()

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
You are an expert tutor providing constructive feedback to a student.

Subject: ${subjectName}
Topic: ${topicName}
Question: ${question}
Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

Analyze the student's answer and provide helpful, encouraging feedback that:
1. Explains what they got right (if anything)
2. Clearly explains what was incorrect and why
3. Provides guidance on how to improve their understanding
4. Offers study tips or memory aids if relevant
5. Maintains an encouraging and supportive tone

Keep the feedback concise but comprehensive (2-3 sentences).
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const feedback = response.text()

    return NextResponse.json({
      success: true,
      content: feedback,
    })
  } catch (error) {
    console.error("Error generating feedback:", error)
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 })
  }
}
