"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Brain, TrendingUp, Clock, Target, Crown, Sparkles } from "lucide-react"
import Link from "next/link"

interface QuestionResult {
  id: string
  question: string
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  type: "mcq" | "short" | "long"
  explanation?: string
  aiFeedback?: string
}

interface TestResults {
  topicId: string
  topicName: string
  subjectName: string
  questions: any[]
  userAnswers: any[]
  completedAt: string
}

export default function ResultsPage({ params }: { params: { topicId: string } }) {
  const [results, setResults] = useState<QuestionResult[]>([])
  const [testData, setTestData] = useState<TestResults | null>(null)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [isLoadingFeedback, setIsLoadingFeedback] = useState<string | null>(null)

  useEffect(() => {
    loadTestResults()
  }, [params.topicId])

  const loadTestResults = () => {
    const savedResults = localStorage.getItem(`test-results-${params.topicId}`)
    if (savedResults) {
      const data: TestResults = JSON.parse(savedResults)
      setTestData(data)

      const processedResults: QuestionResult[] = data.questions.map((question) => {
        const userAnswer = data.userAnswers.find((a) => a.questionId === question.id)
        const isCorrect = userAnswer?.answer === question.correctAnswer

        return {
          id: question.id,
          question: question.question,
          userAnswer: userAnswer?.answer || "No answer provided",
          correctAnswer: question.correctAnswer,
          isCorrect,
          type: question.type,
          explanation: question.explanation,
        }
      })

      setResults(processedResults)
      setScore(processedResults.filter((r) => r.isCorrect).length)
      setTotalQuestions(processedResults.length)
    }
  }

  const generateAIFeedback = async (questionId: string) => {
    setIsLoadingFeedback(questionId)

    const question = results.find((r) => r.id === questionId)
    if (!question || !testData) return

    try {
      const response = await fetch("/api/gemini/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicName: testData.topicName,
          contentType: "feedback",
          subjectName: testData.subjectName,
          question: question.question,
          userAnswer: question.userAnswer,
          correctAnswer: question.correctAnswer,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setResults((prev) =>
          prev.map((result) => (result.id === questionId ? { ...result, aiFeedback: data.content } : result)),
        )
      }
    } catch (error) {
      console.error("Error generating feedback:", error)
    } finally {
      setIsLoadingFeedback(null)
    }
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md luxury-card">
          <CardContent className="text-center p-8">
            <Crown className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground mb-4">Test results not found for this topic.</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const percentage = Math.round((score / totalQuestions) * 100)
  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return "Outstanding"
    if (percentage >= 80) return "Excellent"
    if (percentage >= 70) return "Good"
    if (percentage >= 60) return "Fair"
    return "Needs Improvement"
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-primary/10">
        <div className="container px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Test Results</h1>
                <p className="text-muted-foreground">
                  {testData.topicName} - {testData.subjectName}
                </p>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="border-primary/20 hover:bg-primary/5 bg-transparent">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container px-4 py-8">
        {/* Score Overview */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="luxury-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Final Score</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(percentage)}`}>
                {score}/{totalQuestions}
              </div>
              <p className="text-xs text-muted-foreground">{percentage}% Correct</p>
            </CardContent>
          </Card>

          <Card className="luxury-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{getPerformanceLevel(percentage)}</div>
              <p className="text-xs text-muted-foreground">Overall assessment</p>
            </CardContent>
          </Card>

          <Card className="luxury-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">Complete</div>
              <p className="text-xs text-muted-foreground">All questions answered</p>
            </CardContent>
          </Card>

          <Card className="luxury-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
              <Brain className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">Available</div>
              <p className="text-xs text-muted-foreground">Get personalized feedback</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Card className="luxury-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5 text-primary" />
              Detailed Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {results.map((result, index) => (
              <div key={result.id}>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {result.isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">Question {index + 1}</h3>
                      <Badge
                        variant={result.isCorrect ? "default" : "destructive"}
                        className={
                          result.isCorrect
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        }
                      >
                        {result.isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                      <Badge variant="outline" className="border-primary/20 text-primary">
                        {result.type.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="text-sm font-medium">{result.question}</p>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Your Answer:</p>
                        <div className="p-3 bg-muted/50 rounded-lg border">
                          <p className="text-sm">{result.userAnswer}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Correct Answer:</p>
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm">{result.correctAnswer}</p>
                        </div>
                      </div>
                    </div>

                    {result.explanation && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Explanation:</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">{result.explanation}</p>
                      </div>
                    )}

                    {!result.isCorrect && (result.type === "short" || result.type === "long") && (
                      <div>
                        {result.aiFeedback ? (
                          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="flex items-center space-x-2 mb-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-primary">AI Feedback</span>
                            </div>
                            <p className="text-sm">{result.aiFeedback}</p>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateAIFeedback(result.id)}
                            disabled={isLoadingFeedback === result.id}
                            className="border-primary/20 hover:bg-primary/5"
                          >
                            {isLoadingFeedback === result.id ? (
                              <>
                                <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Generating Feedback...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-3 w-3" />
                                Get AI Feedback
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {index < results.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <Link href={`/test/${params.topicId}`}>
            <Button variant="outline" className="border-primary/20 hover:bg-primary/5 bg-transparent">
              Retake Test
            </Button>
          </Link>
          <Link href={`/learning-hub/${testData.topicId.split("-")[0]}`}>
            <Button className="btn-premium text-white font-semibold">
              <Brain className="mr-2 h-4 w-4" />
              Continue Learning
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
