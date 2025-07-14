"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronRight,
  ChevronDown,
  Brain,
  FileText,
  Map,
  Zap,
  BookOpen,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Info,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { CheatsheetRenderer } from "@/components/cheatsheet-renderer"
import { CompletionModal } from "@/components/completion-modal"
import Link from "next/link"

interface Topic {
  id: string
  name: string
  isCompleted: boolean
  children?: Topic[]
  isExpanded?: boolean
}

interface Subject {
  id: string
  name: string
  syllabus?: string
  mindMap: Topic[]
  progress: number
  totalTopics: number
  completedTopics: number
}

interface ContentCache {
  [topicId: string]: {
    roadmap?: string
    detailedNotes?: string
    shortNotes?: string
    flashcards?: Array<{ question: string; answer: string }>
    cheatsheet?: string
    quiz?: Array<{ question: string; options?: string[]; answer: string; type: string; explanation?: string }>
  }
}

export default function LearningHub({ params }: { params: { id: string } }) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string>("")
  const [activeTab, setActiveTab] = useState("roadmap")
  const [contentCache, setContentCache] = useState<ContentCache>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [fallbackMessage, setFallbackMessage] = useState("")

  // Load subject data from localStorage
  useEffect(() => {
    const savedSubjects = localStorage.getItem("Learnyst-subjects")
    if (savedSubjects) {
      const subjects = JSON.parse(savedSubjects)
      const currentSubject = subjects.find((s: Subject) => s.id === params.id)
      if (currentSubject) {
        setSubject(currentSubject)
        // Auto-select first topic
        if (currentSubject.mindMap && currentSubject.mindMap.length > 0) {
          const firstTopic = currentSubject.mindMap[0]
          if (firstTopic.children && firstTopic.children.length > 0) {
            setSelectedTopic(firstTopic.children[0].id)
          } else {
            setSelectedTopic(firstTopic.id)
          }
        }
      }
    }
  }, [params.id])

  // Auto-generate content when topic is selected
  useEffect(() => {
    if (selectedTopic && subject) {
      const topicContent = contentCache[selectedTopic]
      const currentContent = topicContent?.[activeTab as keyof typeof topicContent]

      if (!currentContent && !isLoading) {
        generateContent(selectedTopic, activeTab)
      }
    }
  }, [selectedTopic, activeTab])

  const updateSubjectInStorage = (updatedSubject: Subject) => {
    const savedSubjects = localStorage.getItem("Learnyst-subjects")
    if (savedSubjects) {
      const subjects = JSON.parse(savedSubjects)
      const updatedSubjects = subjects.map((s: Subject) => (s.id === updatedSubject.id ? updatedSubject : s))
      localStorage.setItem("Learnyst-subjects", JSON.stringify(updatedSubjects))
    }
  }

  const toggleTopicCompletion = (topicId: string) => {
    if (!subject) return

    const updateTopics = (topics: Topic[]): Topic[] => {
      return topics.map((topic) => {
        if (topic.id === topicId) {
          const newCompleted = !topic.isCompleted
          const updatedTopic = { ...topic, isCompleted: newCompleted }

          // If has children, update all children
          if (topic.children) {
            updatedTopic.children = topic.children.map((child) => ({
              ...child,
              isCompleted: newCompleted,
            }))
          }

          return updatedTopic
        } else if (topic.children) {
          const updatedChildren = updateTopics(topic.children)
          // Check if all children are completed
          const allChildrenCompleted = updatedChildren.every((child) => child.isCompleted)
          return {
            ...topic,
            children: updatedChildren,
            isCompleted: allChildrenCompleted,
          }
        }
        return topic
      })
    }

    const updatedMindMap = updateTopics(subject.mindMap)
    const completedCount = countCompletedTopics(updatedMindMap)
    const totalCount = countTotalTopics(updatedMindMap)

    const updatedSubject = {
      ...subject,
      mindMap: updatedMindMap,
      completedTopics: completedCount,
      progress: Math.round((completedCount / totalCount) * 100),
    }

    setSubject(updatedSubject)
    updateSubjectInStorage(updatedSubject)

    // Check if all topics are completed
    if (completedCount === totalCount && completedCount > 0) {
      setShowCompletionModal(true)
    }
  }

  const countCompletedTopics = (topics: Topic[]): number => {
    return topics.reduce((count, topic) => {
      let topicCount = topic.isCompleted ? 1 : 0
      if (topic.children) {
        topicCount += countCompletedTopics(topic.children)
      }
      return count + topicCount
    }, 0)
  }

  const countTotalTopics = (topics: Topic[]): number => {
    return topics.reduce((count, topic) => {
      let topicCount = 1
      if (topic.children) {
        topicCount += countTotalTopics(topic.children)
      }
      return count + topicCount
    }, 0)
  }

  const toggleTopic = (topicId: string) => {
    if (!subject) return

    const updateTopics = (topics: Topic[]): Topic[] => {
      return topics.map((topic) =>
        topic.id === topicId
          ? { ...topic, isExpanded: !topic.isExpanded }
          : { ...topic, children: topic.children ? updateTopics(topic.children) : undefined },
      )
    }

    setSubject({
      ...subject,
      mindMap: updateTopics(subject.mindMap),
    })
  }

  const generateContent = async (topicId: string, contentType: string) => {
    if (!subject) return

    setIsLoading(true)
    setError("")
    setFallbackMessage("")

    try {
      const topicName = getTopicName(topicId)
      const response = await fetch("/api/gemini/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicName,
          contentType,
          subjectName: subject.name,
          syllabus: subject.syllabus || "",
        }),
      })

      const data = await response.json()

      // Always accept the response since our API now handles errors gracefully
      setContentCache((prev) => ({
        ...prev,
        [topicId]: {
          ...prev[topicId],
          [contentType]: data.content,
        },
      }))

      if (data.fallback) {
        setFallbackMessage(data.message)
      }
    } catch (error: any) {
      console.error("Error generating content:", error)

      // Provide immediate fallback content
      const fallbackContent = getLocalFallbackContent(contentType, getTopicName(topicId))
      setContentCache((prev) => ({
        ...prev,
        [topicId]: {
          ...prev[topicId],
          [contentType]: fallbackContent,
        },
      }))

      setFallbackMessage("Using offline educational content. Full features available when service is restored.")
    } finally {
      setIsLoading(false)
    }
  }

  const getTopicName = (topicId: string): string => {
    if (!subject) return "Unknown Topic"

    const findTopic = (topics: Topic[]): string | null => {
      for (const topic of topics) {
        if (topic.id === topicId) return topic.name
        if (topic.children) {
          const found = findTopic(topic.children)
          if (found) return found
        }
      }
      return null
    }

    return findTopic(subject.mindMap) || "Unknown Topic"
  }

  const renderTopic = (topic: Topic, level = 0) => (
    <div key={topic.id} className={`ml-${level * 4}`}>
      <Card
        className={`mb-3 cursor-pointer transition-all duration-300 ${
          selectedTopic === topic.id
            ? "topic-item-premium selected"
            : topic.isCompleted
              ? "topic-item-premium completed"
              : "topic-item-premium"
        }`}
        onClick={() => setSelectedTopic(topic.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <Checkbox
                checked={topic.isCompleted}
                onCheckedChange={() => toggleTopicCompletion(topic.id)}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-neon data-[state=checked]:border-neon data-[state=checked]:text-black"
              />
              <span
                className={`font-medium ${
                  selectedTopic === topic.id ? "neon-accent" : topic.isCompleted ? "topic-name" : ""
                }`}
              >
                {topic.name}
              </span>
              {topic.isCompleted && <CheckCircle className="h-4 w-4 neon-accent" />}
            </div>
            {topic.children && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleTopic(topic.id)
                }}
                className="hover:bg-muted/50"
              >
                {topic.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {topic.children && topic.isExpanded && (
        <div className="ml-6">{topic.children.map((child) => renderTopic(child, level + 1))}</div>
      )}
    </div>
  )

  const renderContent = () => {
    if (!selectedTopic) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-foreground" />
            <p>Select a topic from the mind map to start learning</p>
          </div>
        </div>
      )
    }

    const topicContent = contentCache[selectedTopic]
    const currentContent = topicContent?.[activeTab as keyof typeof topicContent]

    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="shimmer-premium h-4 w-32 rounded"></div>
            <Sparkles className="h-4 w-4 neon-accent animate-pulse" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="text-center text-sm text-muted-foreground mt-4">
            Generating educational content for <strong className="neon-accent">{getTopicName(selectedTopic)}</strong>...
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={() => generateContent(selectedTopic, activeTab)}
              variant="outline"
              className="premium-button-outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    if (!currentContent) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-pulse">
              <Sparkles className="h-8 w-8 mx-auto mb-4 neon-accent" />
            </div>
            <p className="text-sm text-muted-foreground">
              Loading educational content for <strong className="neon-accent">{getTopicName(selectedTopic)}</strong>...
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {fallbackMessage && (
          <Alert className="premium-card border-neon/20 bg-neon/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">{fallbackMessage}</AlertDescription>
          </Alert>
        )}

        <div className="content-area-premium">
          {activeTab === "flashcards" && Array.isArray(currentContent) && (
            <FlashcardViewer flashcards={currentContent} />
          )}

          {activeTab === "quiz" && Array.isArray(currentContent) && (
            <QuizViewer questions={currentContent} topicId={selectedTopic} />
          )}

          {activeTab === "cheatsheet" && typeof currentContent === "string" && (
            <CheatsheetRenderer content={currentContent} />
          )}

          {(activeTab === "roadmap" || activeTab === "detailedNotes" || activeTab === "shortNotes") &&
            typeof currentContent === "string" && (
              <MarkdownRenderer content={currentContent} className="markdown-premium" />
            )}
        </div>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-foreground mx-auto mb-4" />
          <p>Subject not found</p>
          <Link href="/dashboard">
            <Button className="mt-4 premium-button">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="nav-premium">
        <div className="container-premium">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="hover:bg-muted/50">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="brand-logo">
                  <span className="text-background font-bold text-lg">L</span>
                </div>
                <span className="text-premium-5 font-bold">{subject.name}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                Progress: <span className="neon-accent font-semibold">{subject.progress}%</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="container-premium py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
          {/* Left Panel - Mind Map */}
          <div className="lg:col-span-1">
            <Card className="learning-card-premium h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Map className="mr-2 h-5 w-5 neon-accent" />
                    Learning Mind Map
                  </span>
                  <Badge variant="secondary" className="bg-neon/10 text-neon border-neon/20">
                    {subject.completedTopics}/{subject.totalTopics}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(100vh-12rem)]">
                {subject.mindMap.map((topic) => renderTopic(topic))}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Content */}
          <div className="lg:col-span-2">
            <Card className="learning-card-premium h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Brain className="mr-2 h-5 w-5 neon-accent" />
                    {getTopicName(selectedTopic)}
                  </span>
                  <Badge variant="secondary" className="bg-neon/10 text-neon border-neon/20">
                    {activeTab}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                  <TabsList className="grid w-full grid-cols-6 bg-muted/20 p-1">
                    <TabsTrigger value="roadmap" className="tab-premium">
                      <Map className="h-3 w-3 mr-1" />
                      Roadmap
                    </TabsTrigger>
                    <TabsTrigger value="detailedNotes" className="tab-premium">
                      <FileText className="h-3 w-3 mr-1" />
                      Detailed
                    </TabsTrigger>
                    <TabsTrigger value="shortNotes" className="tab-premium">
                      <BookOpen className="h-3 w-3 mr-1" />
                      Short
                    </TabsTrigger>
                    <TabsTrigger value="flashcards" className="tab-premium">
                      <Zap className="h-3 w-3 mr-1" />
                      Cards
                    </TabsTrigger>
                    <TabsTrigger value="cheatsheet" className="tab-premium">
                      <FileText className="h-3 w-3 mr-1" />
                      Cheat
                    </TabsTrigger>
                    <TabsTrigger value="quiz" className="tab-premium">
                      <HelpCircle className="h-3 w-3 mr-1" />
                      Quiz
                    </TabsTrigger>
                  </TabsList>

                  {["roadmap", "detailedNotes", "shortNotes", "flashcards", "cheatsheet", "quiz"].map((tab) => (
                    <TabsContent key={tab} value={tab} className="mt-6 h-[calc(100vh-16rem)] overflow-y-auto">
                      {renderContent()}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      <CompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        subjectName={subject.name}
        totalTopics={subject.totalTopics}
      />
    </div>
  )
}

function FlashcardViewer({ flashcards }: { flashcards: Array<{ question: string; answer: string }> }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length)
    setIsFlipped(false)
  }

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
    setIsFlipped(false)
  }

  if (!flashcards.length) return null

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Badge variant="outline" className="border-neon/20 text-neon">
          Card {currentIndex + 1} of {flashcards.length}
        </Badge>
      </div>

      <Card
        className="min-h-[200px] cursor-pointer transition-all duration-300 hover:scale-105 learning-card-premium"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <CardContent className="flex items-center justify-center p-8 text-center">
          <div>
            {!isFlipped ? (
              <div>
                <h3 className="text-lg font-semibold mb-4 neon-accent">Question</h3>
                <p className="text-lg">{flashcards[currentIndex].question}</p>
                <p className="text-sm text-muted-foreground mt-4 flex items-center justify-center">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Click to reveal answer
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-4 neon-accent">Answer</h3>
                <p className="text-lg">{flashcards[currentIndex].answer}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={prevCard} variant="outline" className="premium-button-outline bg-transparent">
          Previous
        </Button>
        <Button onClick={() => setIsFlipped(!isFlipped)} className="premium-button-neon">
          {isFlipped ? "Show Question" : "Show Answer"}
        </Button>
        <Button onClick={nextCard} variant="outline" className="premium-button-outline bg-transparent">
          Next
        </Button>
      </div>
    </div>
  )
}

function QuizViewer({
  questions,
  topicId,
}: {
  questions: Array<{ question: string; options?: string[]; answer: string; type: string; explanation?: string }>
  topicId: string
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Practice Quiz</h3>
        <p className="text-muted-foreground">Test your knowledge with these educational questions</p>
      </div>

      <Link href={`/test/${topicId}`}>
        <Button className="w-full premium-button-neon font-semibold">
          <HelpCircle className="mr-2 h-4 w-4" />
          Start Full Quiz ({questions.length} questions)
        </Button>
      </Link>

      <div className="space-y-4">
        {questions.slice(0, 3).map((question, index) => (
          <Card key={index} className="learning-card-premium">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Badge variant="outline" className="border-neon/20 text-neon">
                    {index + 1}
                  </Badge>
                  <p className="font-medium">{question.question}</p>
                </div>

                {question.options && (
                  <div className="ml-8 space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="text-sm text-muted-foreground">
                        {String.fromCharCode(65 + optIndex)}. {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {questions.length > 3 && (
        <p className="text-center text-muted-foreground">
          +{questions.length - 3} more questions available in full quiz
        </p>
      )}
    </div>
  )
}

// Add local fallback function
const getLocalFallbackContent = (contentType: string, topicName: string) => {
  const fallbacks = {
    roadmap: `# Learning Roadmap: ${topicName}

## Phase 1: Foundation Building (Week 1-2)
### Prerequisites and Preparation
- Review fundamental concepts and terminology related to ${topicName}
- Understand basic principles that underpin this topic
- Gather necessary study materials and create organized notes
- Set up a dedicated study environment and schedule
- Identify connections to previously learned concepts

### Foundation Goals
- **Master Core Definitions**: Understand key terms and concepts
- **Build Conceptual Framework**: Create mental models for understanding
- **Establish Study Habits**: Develop consistent learning routines
- **Assess Prior Knowledge**: Identify strengths and areas for improvement

## Phase 2: Core Learning (Week 3-4)
### Main Concepts and Theory
- **Theoretical Foundations**: Study the underlying principles of ${topicName}
- **Key Relationships**: Understand how different aspects connect
- **Practical Applications**: Learn how theory applies to real situations
- **Problem-Solving Methods**: Master basic techniques and approaches
- **Examples and Case Studies**: Work through representative problems

### Skill Development Activities
- Practice fundamental calculations and procedures
- Work through guided examples step-by-step
- Complete practice problems of increasing difficulty
- Create concept maps and visual summaries
- Engage in active recall and self-testing

## Phase 3: Advanced Application (Week 5-6)
### Complex Scenarios and Integration
- **Advanced Problem-Solving**: Tackle multi-step and complex problems
- **Real-World Applications**: Study how ${topicName} is used professionally
- **Interdisciplinary Connections**: Explore links to other subjects
- **Critical Analysis**: Evaluate different approaches and solutions
- **Creative Applications**: Apply knowledge in novel situations

### Practical Implementation
- Work on comprehensive projects or case studies
- Analyze real-world examples and applications
- Practice explaining concepts to others
- Develop problem-solving strategies and heuristics
- Connect learning to current events or industry trends

## Phase 4: Mastery & Assessment (Week 7-8)
### Comprehensive Review and Synthesis
- **Complete Topic Review**: Systematically review all major concepts
- **Integration Practice**: Combine knowledge from different areas
- **Weak Area Focus**: Identify and strengthen areas of difficulty
- **Practice Assessments**: Complete practice tests and evaluations
- **Peer Teaching**: Explain concepts to study partners

### Preparation for Advanced Study
- **Next Level Topics**: Identify logical next steps in learning
- **Resource Compilation**: Gather materials for continued study
- **Skill Transfer**: Practice applying knowledge to new contexts
- **Long-term Retention**: Develop strategies for maintaining knowledge
- **Professional Applications**: Explore career-relevant uses

## Study Strategies and Tips
### Effective Learning Techniques
- **Active Reading**: Engage with material through questioning and summarizing
- **Spaced Repetition**: Review material at increasing intervals
- **Practice Testing**: Regularly test yourself on key concepts
- **Elaborative Interrogation**: Ask "why" and "how" questions
- **Interleaving**: Mix different types of problems and concepts

### Resource Recommendations
- **Primary Sources**: Textbooks and academic materials
- **Online Resources**: Educational videos and interactive content
- **Practice Materials**: Problem sets and worked examples
- **Study Groups**: Collaborative learning opportunities
- **Professional Resources**: Industry publications and case studies

### Progress Monitoring
- **Weekly Self-Assessment**: Evaluate understanding and progress
- **Concept Mapping**: Create visual representations of knowledge
- **Problem-Solving Logs**: Track approaches and solutions
- **Reflection Journals**: Document learning insights and challenges
- **Milestone Celebrations**: Acknowledge achievements and progress

## Success Indicators
By the end of this roadmap, you should be able to:
- ✅ Explain ${topicName} concepts clearly and accurately
- ✅ Apply knowledge to solve practical problems
- ✅ Connect ${topicName} to broader subject knowledge
- ✅ Analyze complex scenarios using learned principles
- ✅ Teach concepts to others effectively
- ✅ Identify areas for continued learning and growth

*This roadmap provides a structured approach to mastering ${topicName}. Adjust the timeline based on your learning pace and prior knowledge.*`,

    detailedNotes: `# ${topicName} - Comprehensive Notes

## Overview
${topicName} is a fundamental concept that requires systematic understanding and practical application.

## Key Concepts
- **Definition**: Core understanding of the topic
- **Principles**: Fundamental rules and relationships
- **Applications**: Real-world uses and implementations
- **Connections**: Links to related concepts

## Detailed Analysis
### Theoretical Foundation
The theoretical basis provides the framework for understanding how and why the concept works.

### Practical Applications
Real-world applications demonstrate the relevance and importance of the topic.

### Problem-Solving Approaches
Systematic methods for applying knowledge to solve problems.

## Summary
Key takeaways and essential points for retention and application.`,

    shortNotes: `# ${topicName} - Quick Notes

## 🎯 Key Points
• Core concept and definition
• Main principles and rules
• Important applications
• Key relationships

## 📐 Essential Information
• Basic formulas or procedures
• Important facts to remember
• Common applications
• Study tips

## 💡 Quick Tips
• Focus on understanding over memorization
• Practice with real examples
• Connect to other topics
• Review regularly

## ⚡ Must Remember
• Most critical concepts
• Key relationships
• Common mistakes to avoid`,

    flashcards: Array.from({ length: 20 }, (_, i) => ({
      question: `Question ${i + 1} about ${topicName}: What is a key concept you should understand?`,
      answer: `This is a comprehensive answer that explains the concept clearly and provides context for better understanding.`,
    })),

    cheatsheet: `# 📋 ${topicName} Cheat Sheet

## 🎯 Quick Reference
**Key Concept**: Main idea and definition
**Important Rule**: Essential principle to remember
**Common Use**: Primary application

## 📐 Essential Info
| Item | Description | Notes |
|------|-------------|-------|
| Concept 1 | Basic principle | Remember this |
| Concept 2 | Application | Use when... |

## ✅ Best Practices
• **DO**: Follow best practices
• **DON'T**: Avoid common mistakes

## 🧠 Memory Aids
• Use visual associations
• Create meaningful connections
• Practice regularly`,

    quiz: Array.from({ length: 12 }, (_, i) => ({
      question: `Question ${i + 1}: What is an important aspect of ${topicName}?`,
      type: i % 3 === 0 ? "mcq" : "short",
      options: i % 3 === 0 ? ["Option A", "Option B", "Option C", "Option D"] : undefined,
      correctAnswer: i % 3 === 0 ? "Option A" : "Sample answer explaining the concept",
      explanation: "This explains why the answer is correct and provides additional context.",
    })),
  }

  return fallbacks[contentType as keyof typeof fallbacks] || `Educational content for ${topicName}`
}
