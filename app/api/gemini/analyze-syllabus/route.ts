import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"

// Initialize both API clients
const genAI1 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1 || "")
const genAI2 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2 || "")

async function callGeminiWithFailover(prompt: string, maxRetries = 2): Promise<string> {
  const apiKeys = [
    { client: genAI1, name: "GEMINI_API_KEY_1" },
    { client: genAI2, name: "GEMINI_API_KEY_2" },
  ]

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const { client, name } = apiKeys[keyIndex]

    // Skip if API key is not configured
    if (!process.env[name as keyof typeof process.env]) {
      console.log(`${name} not configured, skipping...`)
      continue
    }

    console.log(`Attempting API call with ${name}...`)

    try {
      const model = client.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 3000,
        },
      })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      console.log(`✅ Success with ${name}`)
      return text
    } catch (error: any) {
      console.error(`❌ Error with ${name}:`, error.message)

      // Check if this is a quota/rate limit error
      if (
        error.message?.includes("429") ||
        error.message?.includes("quota") ||
        error.message?.includes("exceeded") ||
        error.message?.includes("rate limit")
      ) {
        console.log(`🔄 ${name} quota exceeded, trying next API key...`)

        // If this is the last API key, throw the error
        if (keyIndex === apiKeys.length - 1) {
          throw new Error("All API keys have exceeded their quota limits")
        }

        // Continue to next API key
        continue
      }

      // For non-quota errors, retry with same key once
      if (maxRetries > 0) {
        console.log(`🔄 Retrying with ${name}...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return callGeminiWithFailover(prompt, maxRetries - 1)
      }

      // If not a quota error and no retries left, try next key
      if (keyIndex < apiKeys.length - 1) {
        console.log(`🔄 Trying next API key due to error: ${error.message}`)
        continue
      }

      // If this is the last key and we have other errors, throw
      throw error
    }
  }

  throw new Error("No valid API keys available")
}

export async function POST(request: NextRequest) {
  try {
    const { subjectName, syllabus } = await request.json()

    // Check if at least one API key is configured
    if (!process.env.GEMINI_API_KEY_1 && !process.env.GEMINI_API_KEY_2) {
      console.log("No Gemini API keys configured, using fallback mind map")
      const fallbackMindMap = generateFallbackMindMap(subjectName, syllabus)
      return NextResponse.json({
        success: true,
        mindMap: fallbackMindMap,
        totalTopics: countTopics(fallbackMindMap),
        fallback: true,
        message: "Using structured learning path. AI enhancement available with API key.",
      })
    }

    const prompt = `
You are an expert educational content analyzer. Analyze the following syllabus for "${subjectName}" and create a comprehensive, hierarchical mind map structure.

IMPORTANT INSTRUCTIONS:
1. Break down the syllabus into detailed topics and subtopics
2. If the user provided only main topics, expand them into meaningful subtopics
3. Create 4-6 main topics, each with 3-5 subtopics
4. Use clear, educational names that students can understand
5. Ensure comprehensive coverage of the entire syllabus
6. Make the structure logical and progressive (basic to advanced)

Syllabus Content:
${syllabus}

Return ONLY a valid JSON object in this exact format:
{
  "mindMap": [
    {
      "id": "topic1",
      "name": "Fundamentals and Introduction",
      "isCompleted": false,
      "children": [
        {
          "id": "topic1-1",
          "name": "Basic Concepts and Definitions",
          "isCompleted": false
        },
        {
          "id": "topic1-2",
          "name": "Historical Background",
          "isCompleted": false
        }
      ]
    }
  ]
}

Make sure each topic and subtopic has:
- Unique ID
- Descriptive name
- isCompleted: false (default)
- Children array for main topics
`

    try {
      const text = await callGeminiWithFailover(prompt)

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response")
      }

      const mindMapData = JSON.parse(jsonMatch[0])

      return NextResponse.json({
        success: true,
        mindMap: mindMapData.mindMap,
        totalTopics: countTopics(mindMapData.mindMap),
      })
    } catch (apiError: any) {
      console.error("All API keys failed:", apiError)

      // Only use fallback if all API keys are exhausted
      if (apiError.message?.includes("All API keys have exceeded their quota limits")) {
        const fallbackMindMap = generateFallbackMindMap(subjectName, syllabus)
        return NextResponse.json({
          success: true,
          mindMap: fallbackMindMap,
          totalTopics: countTopics(fallbackMindMap),
          fallback: true,
          message: "All AI quotas exceeded. Using comprehensive learning structure. Quotas reset in 24 hours.",
        })
      }

      // For other errors, still provide fallback but with different message
      const fallbackMindMap = generateFallbackMindMap(subjectName, syllabus)
      return NextResponse.json({
        success: true,
        mindMap: fallbackMindMap,
        totalTopics: countTopics(fallbackMindMap),
        fallback: true,
        message: "AI service temporarily unavailable. Using structured learning path.",
      })
    }
  } catch (error: any) {
    console.error("Error analyzing syllabus:", error)

    // Always provide fallback content instead of failing
    try {
      const body = await request.json()
      const fallbackMindMap = generateFallbackMindMap(body.subjectName || "Subject", body.syllabus || "")
      return NextResponse.json({
        success: true,
        mindMap: fallbackMindMap,
        totalTopics: countTopics(fallbackMindMap),
        fallback: true,
        message: "Using structured learning path. Service will be available when quota resets.",
      })
    } catch (parseError) {
      // If we can't even parse the request, provide basic fallback
      const fallbackMindMap = generateFallbackMindMap("Subject", "")
      return NextResponse.json({
        success: true,
        mindMap: fallbackMindMap,
        totalTopics: countTopics(fallbackMindMap),
        fallback: true,
        message: "Using basic learning structure.",
      })
    }
  }
}

function countTopics(mindMap: any[]): number {
  let count = 0
  for (const topic of mindMap) {
    count += 1
    if (topic.children) {
      count += topic.children.length
    }
  }
  return count
}

function generateFallbackMindMap(subjectName: string, syllabus: string) {
  // Analyze the syllabus content to create a more relevant structure
  const syllabusLower = syllabus.toLowerCase()

  // Try to extract topics from the syllabus
  const extractedTopics = extractTopicsFromSyllabus(syllabus, subjectName)

  if (extractedTopics.length > 0) {
    return extractedTopics
  }

  // Default structure based on subject type
  if (syllabusLower.includes("math") || syllabusLower.includes("calculus") || syllabusLower.includes("algebra")) {
    return [
      {
        id: "fundamentals",
        name: "Mathematical Fundamentals",
        isCompleted: false,
        children: [
          { id: "fundamentals-1", name: "Basic Concepts and Definitions", isCompleted: false },
          { id: "fundamentals-2", name: "Number Systems and Operations", isCompleted: false },
          { id: "fundamentals-3", name: "Algebraic Expressions", isCompleted: false },
          { id: "fundamentals-4", name: "Equations and Inequalities", isCompleted: false },
        ],
      },
      {
        id: "functions",
        name: "Functions and Graphs",
        isCompleted: false,
        children: [
          { id: "functions-1", name: "Function Concepts", isCompleted: false },
          { id: "functions-2", name: "Linear and Quadratic Functions", isCompleted: false },
          { id: "functions-3", name: "Polynomial Functions", isCompleted: false },
          { id: "functions-4", name: "Exponential and Logarithmic Functions", isCompleted: false },
        ],
      },
      {
        id: "calculus",
        name: "Calculus Concepts",
        isCompleted: false,
        children: [
          { id: "calculus-1", name: "Limits and Continuity", isCompleted: false },
          { id: "calculus-2", name: "Derivatives and Applications", isCompleted: false },
          { id: "calculus-3", name: "Integration Techniques", isCompleted: false },
          { id: "calculus-4", name: "Applications of Integration", isCompleted: false },
        ],
      },
      {
        id: "applications",
        name: "Real-World Applications",
        isCompleted: false,
        children: [
          { id: "applications-1", name: "Problem-Solving Strategies", isCompleted: false },
          { id: "applications-2", name: "Mathematical Modeling", isCompleted: false },
          { id: "applications-3", name: "Optimization Problems", isCompleted: false },
        ],
      },
    ]
  }

  if (
    syllabusLower.includes("computer") ||
    syllabusLower.includes("programming") ||
    syllabusLower.includes("software")
  ) {
    return [
      {
        id: "fundamentals",
        name: "Programming Fundamentals",
        isCompleted: false,
        children: [
          { id: "fundamentals-1", name: "Introduction to Programming", isCompleted: false },
          { id: "fundamentals-2", name: "Variables and Data Types", isCompleted: false },
          { id: "fundamentals-3", name: "Control Structures", isCompleted: false },
          { id: "fundamentals-4", name: "Functions and Procedures", isCompleted: false },
        ],
      },
      {
        id: "datastructures",
        name: "Data Structures",
        isCompleted: false,
        children: [
          { id: "datastructures-1", name: "Arrays and Lists", isCompleted: false },
          { id: "datastructures-2", name: "Stacks and Queues", isCompleted: false },
          { id: "datastructures-3", name: "Trees and Graphs", isCompleted: false },
          { id: "datastructures-4", name: "Hash Tables", isCompleted: false },
        ],
      },
      {
        id: "algorithms",
        name: "Algorithms",
        isCompleted: false,
        children: [
          { id: "algorithms-1", name: "Sorting Algorithms", isCompleted: false },
          { id: "algorithms-2", name: "Search Algorithms", isCompleted: false },
          { id: "algorithms-3", name: "Graph Algorithms", isCompleted: false },
          { id: "algorithms-4", name: "Dynamic Programming", isCompleted: false },
        ],
      },
      {
        id: "applications",
        name: "Software Development",
        isCompleted: false,
        children: [
          { id: "applications-1", name: "Software Design Principles", isCompleted: false },
          { id: "applications-2", name: "Testing and Debugging", isCompleted: false },
          { id: "applications-3", name: "Project Development", isCompleted: false },
        ],
      },
    ]
  }

  // Generic structure for any subject
  return [
    {
      id: "introduction",
      name: "Introduction and Fundamentals",
      isCompleted: false,
      children: [
        { id: "introduction-1", name: "Basic Concepts and Definitions", isCompleted: false },
        { id: "introduction-2", name: "Historical Context and Development", isCompleted: false },
        { id: "introduction-3", name: "Key Terminology and Vocabulary", isCompleted: false },
        { id: "introduction-4", name: "Foundational Principles", isCompleted: false },
      ],
    },
    {
      id: "core",
      name: "Core Concepts and Theory",
      isCompleted: false,
      children: [
        { id: "core-1", name: "Theoretical Framework", isCompleted: false },
        { id: "core-2", name: "Main Principles and Laws", isCompleted: false },
        { id: "core-3", name: "Key Models and Systems", isCompleted: false },
        { id: "core-4", name: "Important Relationships", isCompleted: false },
      ],
    },
    {
      id: "intermediate",
      name: "Intermediate Topics",
      isCompleted: false,
      children: [
        { id: "intermediate-1", name: "Advanced Theoretical Concepts", isCompleted: false },
        { id: "intermediate-2", name: "Practical Applications", isCompleted: false },
        { id: "intermediate-3", name: "Problem-Solving Techniques", isCompleted: false },
        { id: "intermediate-4", name: "Case Studies and Examples", isCompleted: false },
      ],
    },
    {
      id: "advanced",
      name: "Advanced Applications",
      isCompleted: false,
      children: [
        { id: "advanced-1", name: "Complex Problem Solving", isCompleted: false },
        { id: "advanced-2", name: "Real-World Implementation", isCompleted: false },
        { id: "advanced-3", name: "Current Research and Trends", isCompleted: false },
        { id: "advanced-4", name: "Future Developments", isCompleted: false },
      ],
    },
    {
      id: "synthesis",
      name: "Integration and Mastery",
      isCompleted: false,
      children: [
        { id: "synthesis-1", name: "Comprehensive Review", isCompleted: false },
        { id: "synthesis-2", name: "Interdisciplinary Connections", isCompleted: false },
        { id: "synthesis-3", name: "Professional Applications", isCompleted: false },
      ],
    },
  ]
}

function extractTopicsFromSyllabus(syllabus: string, subjectName: string): any[] {
  if (!syllabus || syllabus.length < 50) {
    return []
  }

  // Simple extraction based on common patterns
  const lines = syllabus.split("\n").filter((line) => line.trim().length > 0)
  const topics: any[] = []
  let currentTopic: any = null
  let topicCounter = 1
  let subtopicCounter = 1

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Skip very short lines
    if (trimmedLine.length < 3) continue

    // Check if this looks like a main topic (numbered, capitalized, etc.)
    if (
      /^\d+\./.test(trimmedLine) || // Numbered: "1. Topic"
      /^[A-Z][A-Z\s]+$/.test(trimmedLine) || // ALL CAPS
      /^[A-Z][a-z]+(\s[A-Z][a-z]+)*:?$/.test(trimmedLine) // Title Case
    ) {
      // Save previous topic
      if (currentTopic) {
        topics.push(currentTopic)
      }

      // Create new topic
      currentTopic = {
        id: `topic${topicCounter}`,
        name: trimmedLine.replace(/^\d+\.\s*/, "").replace(/:$/, ""),
        isCompleted: false,
        children: [],
      }
      topicCounter++
      subtopicCounter = 1
    } else if (currentTopic && trimmedLine.length > 10) {
      // Add as subtopic
      currentTopic.children.push({
        id: `topic${topicCounter - 1}-${subtopicCounter}`,
        name: trimmedLine.replace(/^[-•]\s*/, ""),
        isCompleted: false,
      })
      subtopicCounter++
    }
  }

  // Add the last topic
  if (currentTopic) {
    topics.push(currentTopic)
  }

  // Ensure we have at least some structure
  if (topics.length === 0) {
    return []
  }

  // Limit to reasonable number of topics
  return topics.slice(0, 6)
}
