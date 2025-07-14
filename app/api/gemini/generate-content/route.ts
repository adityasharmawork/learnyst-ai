import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"

// Initialize all 5 API clients
const genAI1 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1 || "")
const genAI2 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2 || "")
const genAI3 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_3 || "")
const genAI4 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_4 || "")
const genAI5 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_5 || "")

async function callGeminiWithFailover(prompt: string, maxRetries = 2): Promise<string> {
  const apiKeys = [
    { client: genAI1, name: "GEMINI_API_KEY_1" },
    { client: genAI2, name: "GEMINI_API_KEY_2" },
    { client: genAI3, name: "GEMINI_API_KEY_3" },
    { client: genAI4, name: "GEMINI_API_KEY_4" },
    { client: genAI5, name: "GEMINI_API_KEY_5" },
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
          maxOutputTokens: 4000,
        },
      })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      console.log(`✅ Success with ${name}`)
      return text
    } catch (error: any) {
      console.error(`❌ Error with ${name}:`, error.message)

      // Check if this is a quota/rate limit error or overloaded model
      if (
        error.message?.includes("429") ||
        error.message?.includes("quota") ||
        error.message?.includes("exceeded") ||
        error.message?.includes("rate limit") ||
        error.message?.includes("503") ||
        error.message?.includes("overloaded") ||
        error.message?.includes("The model is overloaded")
      ) {
        console.log(`🔄 ${name} quota exceeded or overloaded, trying next API key...`)

        // If this is the last API key, throw the error
        if (keyIndex === apiKeys.length - 1) {
          throw new Error("All API keys have exceeded their quota limits or are overloaded")
        }

        // Continue to next API key immediately for quota/overload errors
        continue
      }

      // For non-quota/overload errors, retry with same key once
      if (maxRetries > 0) {
        console.log(`🔄 Retrying with ${name}...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return callGeminiWithFailover(prompt, maxRetries - 1)
      }

      // If not a quota/overload error and no retries left, try next key
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
    const { topicName, contentType, subjectName, syllabus, testConfig } = await request.json()

    // Check if at least one API key is available
    const hasApiKey =
      process.env.GEMINI_API_KEY_1 ||
      process.env.GEMINI_API_KEY_2 ||
      process.env.GEMINI_API_KEY_3 ||
      process.env.GEMINI_API_KEY_4 ||
      process.env.GEMINI_API_KEY_5

    if (!hasApiKey) {
      console.log("No Gemini API keys configured, using fallback content")
      const content = getFallbackContent(contentType, topicName, subjectName, syllabus, testConfig)
      return NextResponse.json({
        success: true,
        content,
        contentType,
        topicName,
        fallback: true,
        message: "Using high-quality educational content. AI enhancement available with API key.",
      })
    }

    const prompt = getPromptForContentType(contentType, topicName, subjectName, syllabus, testConfig)
    if (!prompt) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
    }

    try {
      const text = await callGeminiWithFailover(prompt)
      let content = text

      // For flashcards and quiz, parse JSON
      if (contentType === "flashcards" || contentType === "quiz") {
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          try {
            content = JSON.parse(jsonMatch[0])
          } catch (e) {
            console.error("Failed to parse JSON:", e)
            content = getFallbackContent(contentType, topicName, subjectName, syllabus, testConfig)
          }
        } else {
          content = getFallbackContent(contentType, topicName, subjectName, syllabus, testConfig)
        }
      }

      return NextResponse.json({
        success: true,
        content,
        contentType,
        topicName,
      })
    } catch (apiError: any) {
      console.error("All API keys failed:", apiError)

      // Only use fallback if all API keys are exhausted
      if (
        apiError.message?.includes("All API keys have exceeded their quota limits") ||
        apiError.message?.includes("overloaded")
      ) {
        const content = getFallbackContent(contentType, topicName, subjectName, syllabus, testConfig)
        return NextResponse.json({
          success: true,
          content,
          contentType,
          topicName,
          fallback: true,
          message:
            "All AI services are currently overloaded. Using comprehensive educational content. Please try again in a few minutes.",
        })
      }

      // For other errors, still provide fallback but with different message
      const content = getFallbackContent(contentType, topicName, subjectName, syllabus, testConfig)
      return NextResponse.json({
        success: true,
        content,
        contentType,
        topicName,
        fallback: true,
        message: "AI service temporarily unavailable. Using high-quality educational content.",
      })
    }
  } catch (error: any) {
    console.error("Error generating content:", error)

    // Always provide fallback content instead of failing
    try {
      const body = await request.json()
      const content = getFallbackContent(
        body.contentType || "roadmap",
        body.topicName || "Topic",
        body.subjectName || "Subject",
        body.syllabus || "",
        body.testConfig,
      )

      return NextResponse.json({
        success: true,
        content,
        contentType: body.contentType || "roadmap",
        topicName: body.topicName || "Topic",
        fallback: true,
        message: "Using educational content. Service will be available when quota resets.",
      })
    } catch (parseError) {
      // If we can't even parse the request, provide basic fallback
      const content = getFallbackContent("roadmap", "Topic", "Subject", "", null)
      return NextResponse.json({
        success: true,
        content,
        contentType: "roadmap",
        topicName: "Topic",
        fallback: true,
        message: "Using educational content.",
      })
    }
  }
}

function getPromptForContentType(
  contentType: string,
  topicName: string,
  subjectName: string,
  syllabus: string,
  testConfig?: any,
): string | null {
  const prompts = {
    roadmap: `You are an expert educational content creator. Create a comprehensive, detailed learning roadmap for "${topicName}" in the subject "${subjectName}".

Context: This is for a student learning about ${topicName} as part of their ${subjectName} studies.

Create a structured learning roadmap with the following format:

# Learning Roadmap: ${topicName}

## Phase 1: Foundation Building (Week 1-2)
### Prerequisites and Preparation
- List 3-4 specific prerequisite concepts students should review
- Identify key terminology and vocabulary to learn first
- Recommend initial study materials and setup

### Foundation Goals
- Define 3-4 specific learning objectives for this phase
- Explain why these foundations are important
- Provide concrete milestones to track progress

## Phase 2: Core Learning (Week 3-4)
### Main Concepts
- Break down the core concepts of ${topicName} into digestible parts
- Provide specific topics to study in logical order
- Include practical examples and applications

### Skill Development
- List key skills students will develop
- Suggest practice exercises and activities
- Provide methods to assess understanding

## Phase 3: Advanced Application (Week 5-6)
### Complex Topics
- Cover advanced aspects of ${topicName}
- Include real-world applications and case studies
- Connect to broader concepts in ${subjectName}

### Integration
- Show how ${topicName} connects to other topics
- Provide project ideas or practical applications
- Suggest ways to deepen understanding

## Phase 4: Mastery & Assessment (Week 7-8)
### Comprehensive Review
- Create a systematic review strategy
- List key concepts for final mastery
- Provide self-assessment methods

### Next Steps
- Suggest advanced topics to explore next
- Recommend additional resources
- Outline career or academic applications

## Study Tips and Resources
- Provide 5-6 specific study strategies
- Recommend types of practice problems
- Suggest additional learning resources

Generate this roadmap now without asking for additional information. Base the content on standard educational approaches for ${topicName} in ${subjectName}.`,

    detailedNotes: `Generate extremely comprehensive, in-depth educational notes for "${topicName}" in "${subjectName}".

Base your content EXACTLY on this syllabus: ${syllabus || "Standard curriculum"}

Create detailed notes covering EVERY aspect mentioned in the syllabus. Structure as follows:

# ${topicName} - Comprehensive Detailed Notes

## 1. Introduction and Overview
- Complete definition and scope of the topic
- Historical background and development
- Importance in the broader subject context
- Learning objectives and outcomes

## 2. Fundamental Concepts
- Detailed explanation of each core concept
- Mathematical formulations (if applicable)
- Theoretical foundations and principles
- Key terminology with precise definitions

## 3. Detailed Theory and Principles
- In-depth exploration of all theoretical aspects
- Step-by-step derivations and proofs
- Underlying assumptions and limitations
- Connections to related theories

## 4. Practical Applications and Examples
- Multiple worked examples with detailed solutions
- Real-world applications and case studies
- Industry-specific implementations
- Problem-solving methodologies

## 5. Advanced Topics and Extensions
- Complex scenarios and edge cases
- Advanced mathematical treatments
- Current research and developments
- Future trends and implications

## 6. Common Challenges and Solutions
- Typical student difficulties and misconceptions
- Problem-solving strategies and techniques
- Tips for better understanding and retention
- Common exam questions and approaches

## 7. Summary and Key Takeaways
- Essential points for quick review
- Critical formulas and concepts
- Connections to other topics
- Preparation for advanced study

Make these notes extremely detailed - aim for university-level depth covering every subtopic comprehensively.`,

    shortNotes: `Create concise but comprehensive bullet-point notes for "${topicName}" in "${subjectName}".

Base your content EXACTLY on this syllabus: ${syllabus || "Standard curriculum"}

Format as:
# ${topicName} - Quick Reference Notes

## 🎯 Key Concepts
• [Most important concept 1 with brief explanation]
• [Most important concept 2 with brief explanation]
• [Most important concept 3 with brief explanation]
• [Most important concept 4 with brief explanation]

## 📐 Essential Formulas & Rules
• [Formula 1]: [When to use and key points]
• [Formula 2]: [When to use and key points]
• [Rule 1]: [Application and importance]

## 💡 Quick Tips & Tricks
• [Memory technique or shortcut 1]
• [Problem-solving tip 1]
• [Common mistake to avoid 1]
• [Study strategy 1]

## 🔗 Key Relationships
• [How this connects to topic A]
• [How this relates to concept B]
• [Prerequisites and dependencies]

## ⚡ Must Remember
• [Critical takeaway 1]
• [Critical takeaway 2]
• [Critical takeaway 3]

Keep it concise but ensure complete coverage of syllabus content.`,

    flashcards: `Create 25-30 comprehensive flashcards covering the ENTIRE syllabus for "${topicName}" in "${subjectName}".

Base your content EXACTLY on this syllabus: ${syllabus || "Standard curriculum"}

Create engaging, varied flashcards that cover:
- 40% Definition and concept questions
- 30% Application and problem-solving questions
- 20% Analysis and comparison questions
- 10% Synthesis and evaluation questions

Return ONLY a valid JSON array in this exact format:
[
  {
    "question": "Clear, specific question testing understanding",
    "answer": "Comprehensive answer with detailed explanation"
  }
]

Make questions that:
- Test deep understanding, not just memorization
- Cover every major topic in the syllabus
- Include practical applications
- Vary in difficulty from basic to advanced
- Are engaging and thought-provoking

Ensure complete syllabus coverage with 25-30 high-quality flashcards.`,

    cheatsheet: `Create a visually appealing, comprehensive cheat sheet for "${topicName}" in "${subjectName}".

Base your content EXACTLY on this syllabus: ${syllabus || "Standard curriculum"}

Format as an organized, easy-to-scan reference:

# 📋 ${topicName} - Ultimate Cheat Sheet

## 🎯 Quick Definitions
**Term 1**: Concise but complete definition
**Term 2**: Concise but complete definition
**Term 3**: Concise but complete definition

## 📐 Essential Formulas
| Formula | Use Case | Key Points |
|---------|----------|------------|
| [Formula 1] | [When to apply] | [Important notes] |
| [Formula 2] | [When to apply] | [Important notes] |

## 🔄 Step-by-Step Procedures
### Process 1:
1. [Clear step with explanation]
2. [Clear step with explanation]
3. [Clear step with explanation]

### Process 2:
1. [Clear step with explanation]
2. [Clear step with explanation]

## ✅ Best Practices
• **DO**: [Recommended approach 1]
• **DO**: [Recommended approach 2]
• **DON'T**: [Common mistake 1]
• **DON'T**: [Common mistake 2]

## 🧠 Memory Aids
• **Mnemonic 1**: [Memory technique]
• **Visualization**: [Mental model or analogy]
• **Pattern**: [Recognizable pattern or rule]

## ⚡ Quick Reference
• [Key fact 1]
• [Key fact 2]
• [Key relationship]
• [Important exception]

Make it visually organized and perfect for last-minute review.`,

    quiz: `Create a comprehensive quiz with ${testConfig?.questionCount || 15} questions for "${topicName}" in "${subjectName}".

${
  testConfig
    ? `
Test Configuration:
- Question Type: ${testConfig.type === "mixed" ? "Mixed (MCQ, Short, Long)" : testConfig.type.toUpperCase()}
- Number of Questions: ${testConfig.questionCount}
`
    : ""
}

Base your content EXACTLY on this syllabus: ${syllabus || "Standard curriculum"}

Return ONLY a valid JSON array in this exact format:
[
  {
    "question": "Question text",
    "type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Detailed explanation of why this answer is correct"
  },
  {
    "question": "Question text",
    "type": "short",
    "correctAnswer": "Expected answer",
    "explanation": "What makes a good answer and key points to include"
  }
]

${
  testConfig?.type === "mixed"
    ? `
Include:
- 60% multiple choice questions (type: "mcq") with 4 options each
- 30% short answer questions (type: "short")
- 10% long answer questions (type: "long")
`
    : testConfig?.type === "mcq"
      ? `
Create ONLY multiple choice questions (type: "mcq") with 4 options each.
`
      : testConfig?.type === "short"
        ? `
Create ONLY short answer questions (type: "short").
`
        : testConfig?.type === "long"
          ? `
Create ONLY long answer questions (type: "long").
`
          : ""
}

Questions should:
- Cover all major topics from the syllabus
- Range from basic recall to advanced application
- Test real understanding and problem-solving
- Include practical scenarios
- Be challenging but fair

Ensure comprehensive coverage with exactly ${testConfig?.questionCount || 15} high-quality questions.`,
  }

  return prompts[contentType as keyof typeof prompts] || null
}

function getFallbackContent(
  contentType: string,
  topicName: string,
  subjectName: string,
  syllabus: string,
  testConfig?: any,
) {
  const fallbacks = {
    roadmap: `# Learning Roadmap: ${topicName}

## Phase 1: Foundation Building (Week 1-2)
### Prerequisites and Preparation
- Review fundamental concepts related to ${topicName}
- Understand basic terminology and definitions
- Gather necessary study materials and resources
- Set up organized study environment
- Create initial concept map of the topic

### Key Learning Objectives
- Master foundational principles of ${topicName}
- Understand how this topic fits within ${subjectName}
- Identify connections to previously learned concepts
- Establish strong theoretical groundwork

## Phase 2: Core Learning (Week 3-4)
### Main Concepts and Theories
- Deep dive into core principles of ${topicName}
- Study theoretical frameworks and models
- Work through fundamental examples and applications
- Practice basic problem-solving techniques
- Create detailed notes and summaries

### Skill Development
- Develop analytical thinking related to the topic
- Practice applying concepts to simple scenarios
- Build confidence with basic calculations/procedures
- Start connecting theory to practical applications

## Phase 3: Advanced Application (Week 5-6)
### Complex Scenarios and Integration
- Explore advanced aspects of ${topicName}
- Study real-world applications and case studies
- Work on challenging problems and projects
- Integrate knowledge with other topics in ${subjectName}
- Analyze current research and developments

### Practical Implementation
- Apply knowledge to practical situations
- Develop problem-solving strategies
- Create projects demonstrating understanding
- Connect learning to industry applications

## Phase 4: Mastery & Assessment (Week 7-8)
### Comprehensive Review
- Synthesize all learned material
- Review and strengthen weak areas
- Practice with mock tests and assessments
- Create final review materials and summaries
- Prepare for examinations or evaluations

### Advanced Preparation
- Explore connections to future learning
- Identify areas for continued study
- Develop long-term retention strategies
- Plan for practical application of knowledge

## Study Tips and Strategies
- **Active Learning**: Engage with material through practice and application
- **Regular Review**: Schedule consistent review sessions
- **Concept Mapping**: Create visual representations of relationships
- **Practice Problems**: Work through varied examples and exercises
- **Discussion**: Engage with peers and instructors about the topic

## Resources and Materials
- Textbooks and academic resources on ${subjectName}
- Online courses and educational videos
- Practice problems and exercise sets
- Research papers and case studies
- Study groups and discussion forums

*This roadmap provides a structured approach to mastering ${topicName}. Adjust timing based on your learning pace and prior knowledge.*`,

    detailedNotes: `# ${topicName} - Comprehensive Study Notes

## 1. Introduction and Overview

### Definition and Scope
${topicName} is a fundamental concept within ${subjectName} that encompasses key principles, theories, and applications essential for understanding the broader subject matter. This topic serves as a critical building block for advanced learning and practical application in the field.

### Historical Context and Development
The study of ${topicName} has evolved through significant contributions from researchers, practitioners, and theorists over time. Understanding this historical development provides context for current applications and future directions in the field.

### Importance and Relevance
This topic is crucial for several reasons:
- **Foundational Knowledge**: Provides essential understanding for advanced concepts
- **Practical Applications**: Direct relevance to real-world scenarios and problems
- **Interdisciplinary Connections**: Links to other areas within ${subjectName} and related fields
- **Professional Development**: Important for career advancement and practical skills

### Learning Objectives
By the end of studying this topic, you should be able to:
- Understand and explain core concepts and principles
- Apply theoretical knowledge to practical situations
- Analyze complex scenarios using learned frameworks
- Synthesize information from multiple sources
- Evaluate different approaches and solutions

## 2. Fundamental Concepts and Principles

### Core Definitions
**Primary Concept**: The central idea or principle that defines ${topicName}
**Key Terms**: Essential vocabulary and terminology used in the field
**Fundamental Principles**: Basic rules and laws that govern the topic
**Theoretical Framework**: Organized system of concepts and relationships

### Basic Principles
1. **Principle 1**: Fundamental rule or law with explanation and examples
2. **Principle 2**: Core concept with practical applications
3. **Principle 3**: Essential understanding with real-world relevance
4. **Principle 4**: Key relationship with other concepts

### Mathematical Foundations (where applicable)
- Basic equations and formulas
- Mathematical relationships and derivations
- Quantitative analysis methods
- Statistical considerations and applications

## 3. Theoretical Framework and Analysis

### Major Theories and Models
**Theory A**: Comprehensive explanation with key components
- Background and development
- Core assumptions and principles
- Applications and limitations
- Supporting evidence and research

**Theory B**: Alternative or complementary theoretical approach
- Unique perspectives and insights
- Comparative analysis with other theories
- Practical implications and uses
- Current research and developments

### Analytical Methods and Approaches
- Systematic analysis techniques
- Problem-solving methodologies
- Critical thinking frameworks
- Evaluation criteria and standards

## 4. Practical Applications and Examples

### Real-World Applications
**Industry Application 1**: Specific use in professional settings
- Context and background
- Implementation process
- Benefits and challenges
- Case study examples

**Industry Application 2**: Alternative practical application
- Different context or industry
- Unique considerations and requirements
- Success factors and best practices
- Lessons learned and recommendations

### Worked Examples and Problem-Solving
**Example 1**: Step-by-step solution to typical problem
1. Problem identification and analysis
2. Selection of appropriate method or approach
3. Implementation of solution strategy
4. Verification and interpretation of results

**Example 2**: Complex scenario requiring integrated knowledge
1. Multi-faceted problem analysis
2. Integration of multiple concepts and principles
3. Systematic solution development
4. Critical evaluation of outcomes

## 5. Advanced Topics and Current Developments

### Emerging Trends and Research
- Current research directions and findings
- Technological advances and innovations
- Future implications and possibilities
- Interdisciplinary connections and collaborations

### Complex Applications and Case Studies
**Case Study 1**: Detailed analysis of real-world implementation
- Background and context
- Challenges and obstacles
- Solutions and strategies
- Outcomes and lessons learned

**Case Study 2**: Alternative scenario or application
- Different industry or context
- Unique considerations and requirements
- Innovative approaches and solutions
- Impact and significance

## 6. Common Challenges and Problem-Solving Strategies

### Typical Difficulties and Misconceptions
**Common Mistake 1**: Frequent error with explanation and correction
**Common Mistake 2**: Typical misunderstanding with clarification
**Common Mistake 3**: Procedural error with proper method

### Effective Study and Learning Strategies
- **Active Learning Techniques**: Engagement methods for better understanding
- **Memory Aids and Mnemonics**: Tools for retention and recall
- **Practice Strategies**: Effective ways to reinforce learning
- **Self-Assessment Methods**: Techniques for monitoring progress

### Problem-Solving Approaches
1. **Systematic Analysis**: Breaking down complex problems
2. **Pattern Recognition**: Identifying familiar structures and solutions
3. **Creative Thinking**: Developing innovative approaches
4. **Verification Methods**: Checking and validating solutions

## 7. Integration and Connections

### Relationships to Other Topics
- **Prerequisite Knowledge**: What you need to know first
- **Related Concepts**: Connected ideas within ${subjectName}
- **Advanced Applications**: Where this knowledge leads
- **Interdisciplinary Connections**: Links to other fields

### Synthesis and Application
- Combining multiple concepts and principles
- Developing comprehensive understanding
- Creating integrated solutions
- Building expertise and mastery

## 8. Summary and Key Takeaways

### Essential Points for Review
- **Core Concepts**: Most important ideas to remember
- **Key Principles**: Fundamental rules and relationships
- **Critical Applications**: Essential practical uses
- **Important Connections**: Significant relationships and links

### Preparation for Advanced Study
- **Next Steps**: Logical progression in learning
- **Advanced Topics**: Areas for further exploration
- **Research Opportunities**: Potential areas for investigation
- **Professional Development**: Career-related applications

### Quick Reference Guide
- **Key Formulas**: Essential equations and calculations
- **Important Definitions**: Critical terms and concepts
- **Useful Procedures**: Step-by-step processes
- **Common Applications**: Frequent use cases and examples

*These comprehensive notes provide a thorough foundation for understanding ${topicName}. Regular review and practice will help consolidate this knowledge and prepare you for advanced applications.*`,

    shortNotes: `# ${topicName} - Quick Reference Notes

## 🎯 Key Concepts
• **Core Definition**: ${topicName} is a fundamental concept in ${subjectName} that involves [key principle]
• **Primary Purpose**: Main function and importance in the broader subject context
• **Essential Components**: Key elements that make up the topic
• **Basic Principles**: Fundamental rules and relationships that govern the concept
• **Practical Significance**: Why this topic matters in real-world applications

## 📐 Essential Formulas & Rules
• **Basic Formula**: [Key equation] - Used for [specific application]
• **Important Rule**: [Fundamental principle] - Applied when [specific conditions]
• **Calculation Method**: [Step-by-step process] - For solving [type of problem]
• **Conversion Factor**: [Relationship] - When converting between [units/concepts]

## 💡 Quick Tips & Tricks
• **Memory Aid**: Use [mnemonic device] to remember [key concept]
• **Problem-Solving Tip**: Always start by [initial step] when approaching [type of problem]
• **Common Shortcut**: [Efficient method] can save time when [specific situation]
• **Study Strategy**: Focus on [key area] for better understanding of overall concept
• **Verification Method**: Check your work by [validation technique]

## 🔗 Key Relationships
• **Builds Upon**: Requires understanding of [prerequisite concepts]
• **Connects To**: Directly relates to [related topics] in ${subjectName}
• **Leads To**: Foundation for learning [advanced concepts]
• **Interdisciplinary Links**: Also important in [related fields/subjects]
• **Practical Applications**: Used in [real-world contexts]

## ⚡ Must Remember
• **Critical Point 1**: [Most important concept] - This is essential for [reason]
• **Critical Point 2**: [Key relationship] - Remember this connection for [application]
• **Critical Point 3**: [Important principle] - Always consider this when [situation]
• **Common Mistake**: Avoid [typical error] by [correct approach]
• **Success Factor**: Master [key skill] for better performance in [area]

## 🎯 Quick Self-Check
• Can you explain ${topicName} in your own words?
• Do you understand how it connects to other topics in ${subjectName}?
• Can you apply the key principles to solve basic problems?
• Are you familiar with the main practical applications?
• Do you know the common mistakes to avoid?

## 📚 Study Priorities
• **High Priority**: [Most important concepts] - Focus here first
• **Medium Priority**: [Supporting concepts] - Study after mastering basics
• **Low Priority**: [Advanced details] - Review when time permits
• **Practice Focus**: Work on [specific skills] for better understanding

*Use these quick notes for rapid review and to check your understanding of ${topicName}.*`,

    flashcards: Array.from({ length: 25 }, (_, i) => {
      const questionTypes = [
        `What is the fundamental definition of ${topicName}?`,
        `How does ${topicName} relate to other concepts in ${subjectName}?`,
        `What are the key principles governing ${topicName}?`,
        `Describe a practical application of ${topicName}.`,
        `What are the main components of ${topicName}?`,
        `How would you solve a problem involving ${topicName}?`,
        `What are common mistakes when working with ${topicName}?`,
        `Why is ${topicName} important in ${subjectName}?`,
        `What are the prerequisites for understanding ${topicName}?`,
        `How has ${topicName} evolved in the field of ${subjectName}?`,
      ]

      const answers = [
        `${topicName} is a fundamental concept in ${subjectName} that encompasses key principles and applications essential for understanding the broader subject matter.`,
        `${topicName} serves as a foundational element that connects to multiple areas within ${subjectName}, providing the basis for more advanced concepts and practical applications.`,
        `The key principles include systematic analysis, practical application, theoretical understanding, and integration with related concepts in the field.`,
        `Practical applications include real-world problem-solving, industry implementations, research applications, and professional practice in various contexts.`,
        `Main components include theoretical foundations, practical applications, analytical methods, and connections to related concepts within the subject area.`,
        `Problem-solving involves systematic analysis, application of relevant principles, step-by-step methodology, and verification of results using established criteria.`,
        `Common mistakes include oversimplification, ignoring prerequisites, misapplying principles, and failing to consider practical constraints and limitations.`,
        `${topicName} is important because it provides essential knowledge for advanced study, practical applications, professional development, and understanding of related concepts.`,
        `Prerequisites include understanding of basic concepts in ${subjectName}, fundamental mathematical skills, analytical thinking abilities, and familiarity with related terminology.`,
        `${topicName} has evolved through research contributions, technological advances, practical applications, and integration with other fields and disciplines.`,
      ]

      return {
        question: questionTypes[i % questionTypes.length],
        answer: answers[i % answers.length],
      }
    }),

    cheatsheet: `# 📋 ${topicName} - Ultimate Cheat Sheet

## 🎯 Quick Definitions
**${topicName}**: Fundamental concept in ${subjectName} involving key principles and applications
**Core Principle**: Basic rule or law that governs the topic
**Key Application**: Primary use case in practical scenarios
**Important Relationship**: How this connects to other concepts in the field

## 📐 Essential Formulas
| Formula | Use Case | Key Points |
|---------|----------|------------|
| Basic Equation | General calculations | Remember to check units |
| Advanced Formula | Complex scenarios | Consider all variables |
| Conversion Rule | Unit transformations | Maintain precision |

## 🔄 Step-by-Step Procedures
### Basic Problem-Solving Process:
1. **Identify**: Determine the type of problem and relevant information
2. **Analyze**: Break down the problem into manageable components
3. **Apply**: Use appropriate methods and principles
4. **Calculate**: Perform necessary computations carefully
5. **Verify**: Check results for reasonableness and accuracy

### Advanced Analysis Method:
1. **Gather Information**: Collect all relevant data and context
2. **Establish Framework**: Choose appropriate theoretical approach
3. **Systematic Analysis**: Apply analytical methods step-by-step
4. **Integrate Results**: Combine findings into coherent conclusion
5. **Evaluate Outcomes**: Assess implications and significance

## ✅ Best Practices
• **DO**: Start with fundamental principles and build systematically
• **DO**: Check your work using multiple verification methods
• **DO**: Consider practical constraints and real-world limitations
• **DO**: Connect new learning to previously mastered concepts

• **DON'T**: Skip prerequisite knowledge or foundational concepts
• **DON'T**: Ignore units, precision, or significant figures
• **DON'T**: Apply formulas without understanding underlying principles
• **DON'T**: Forget to consider alternative approaches or solutions

## 🧠 Memory Aids
• **Mnemonic 1**: Use memorable acronym to remember key steps
• **Visualization**: Think of visual analogy to understand relationships
• **Connection**: Link to familiar concept for better retention
• **Sequence**: Remember the order through logical progression

## ⚡ Quick Reference
• **Key Fact 1**: Most important principle to remember
• **Key Fact 2**: Critical relationship between concepts
• **Key Fact 3**: Essential application or use case
• **Common Error**: Typical mistake and how to avoid it
• **Success Tip**: Best strategy for mastering the topic

## 🎯 Exam Focus Areas
• **High Priority**: Core definitions and fundamental principles
• **Medium Priority**: Practical applications and problem-solving
• **Know Well**: Relationships to other topics and concepts
• **Review**: Common mistakes and how to avoid them

## 📊 Quick Self-Assessment
□ Can explain ${topicName} clearly and accurately
□ Understand key principles and their applications
□ Can solve basic problems using learned methods
□ Know how this connects to other topics in ${subjectName}
□ Familiar with common applications and examples

*Keep this cheat sheet handy for quick reference during study and review sessions.*`,

    quiz: Array.from({ length: testConfig?.questionCount || 15 }, (_, i) => {
      const types = testConfig?.type === "mixed" ? ["mcq", "short", "long"] : [testConfig?.type || "mcq"]
      const type = types[i % types.length]

      if (type === "mcq") {
        const mcqQuestions = [
          {
            question: `What is the primary focus of ${topicName} in ${subjectName}?`,
            options: [
              "Understanding fundamental principles and applications",
              "Memorizing complex formulas and equations",
              "Learning historical facts and dates",
              "Practicing advanced mathematical calculations",
            ],
            correctAnswer: "Understanding fundamental principles and applications",
            explanation:
              "The primary focus is on understanding core principles and how they apply to real-world situations.",
          },
          {
            question: `Which of the following best describes the relationship between ${topicName} and other concepts in ${subjectName}?`,
            options: [
              "It is completely independent of other topics",
              "It serves as a foundation for advanced concepts",
              "It is only relevant for theoretical study",
              "It has no practical applications",
            ],
            correctAnswer: "It serves as a foundation for advanced concepts",
            explanation:
              "This topic provides essential knowledge that supports understanding of more advanced concepts in the field.",
          },
          {
            question: `What is the most effective approach to learning ${topicName}?`,
            options: [
              "Memorizing all formulas without understanding",
              "Focusing only on theoretical aspects",
              "Combining theory with practical application",
              "Studying in isolation from other topics",
            ],
            correctAnswer: "Combining theory with practical application",
            explanation:
              "The most effective learning combines theoretical understanding with practical application and problem-solving.",
          },
        ]
        return { ...mcqQuestions[i % mcqQuestions.length], type }
      } else {
        const shortQuestions = [
          {
            question: `Explain the importance of ${topicName} in the context of ${subjectName}.`,
            correctAnswer: `${topicName} is important because it provides foundational knowledge essential for understanding advanced concepts, offers practical applications in real-world scenarios, and connects to multiple areas within ${subjectName}.`,
            explanation:
              "A good answer should demonstrate understanding of the topic's role as a foundation, its practical relevance, and its connections to other concepts.",
          },
          {
            question: `Describe the key principles that govern ${topicName}.`,
            correctAnswer: `Key principles include systematic analysis, practical application, theoretical understanding, integration with related concepts, and evidence-based reasoning.`,
            explanation:
              "The answer should show understanding of fundamental principles and their applications in the field.",
          },
          {
            question: `How would you apply knowledge of ${topicName} to solve a practical problem?`,
            correctAnswer: `Application involves identifying the problem type, analyzing relevant factors, applying appropriate principles and methods, implementing solutions systematically, and verifying results.`,
            explanation:
              "A strong answer demonstrates understanding of problem-solving methodology and practical application skills.",
          },
        ]
        return {
          ...shortQuestions[i % shortQuestions.length],
          type,
        }
      }
    }),
  }

  return (
    fallbacks[contentType as keyof typeof fallbacks] ||
    `High-quality educational content for ${topicName} in ${subjectName}. This comprehensive material covers all essential aspects of the topic with detailed explanations, practical examples, and learning strategies.`
  )
}
