"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Clock, CheckCircle, ArrowRight, ArrowLeft, Brain, Play, Settings } from "lucide-react"
import Link from "next/link"

interface Question {
  id: string
  question: string
  type: "mcq" | "short" | "long"
  options?: string[]
  correctAnswer: string
  explanation?: string
}

interface UserAnswer {
  questionId: string
  answer: string
}

interface TestConfig {
  type: "mixed" | "mcq" | "short" | "long"
  questionCount: number
}

export default function TestEnvironment({ params }: { params: { topicId: string } }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [timeRemaining, setTimeRemaining] = useState(1800) // 30 minutes
  const [isTestCompleted, setIsTestCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [topicName, setTopicName] = useState("")
  const [subjectName, setSubjectName] = useState("")
  const [testStarted, setTestStarted] = useState(false)
  const [testConfig, setTestConfig] = useState<TestConfig>({ type: "mixed", questionCount: 15 })
  const [showConfig, setShowConfig] = useState(true)

  useEffect(() => {
    loadTopicData()
  }, [params.topicId])

  useEffect(() => {
    if (timeRemaining > 0 && !isTestCompleted && testStarted) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0 && testStarted) {
      handleSubmitTest()
    }
  }, [timeRemaining, isTestCompleted, testStarted])

  const loadTopicData = () => {
    const savedSubjects = localStorage.getItem("Learnyst-subjects")
    if (savedSubjects) {
      const subjects = JSON.parse(savedSubjects)
      for (const subject of subjects) {
        const topic = findTopicInMindMap(subject.mindMap, params.topicId)
        if (topic) {
          setTopicName(topic.name)
          setSubjectName(subject.name)
          break
        }
      }
    }
  }

  const generateQuizQuestions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/gemini/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicName,
          contentType: "quiz",
          subjectName,
          testConfig,
        }),
      })

      const data = await response.json()
      if (response.ok && Array.isArray(data.content)) {
        let filteredQuestions = data.content

        // Filter by question type if not mixed
        if (testConfig.type !== "mixed") {
          filteredQuestions = data.content.filter((q: any) => q.type === testConfig.type)
        }

        // Limit to requested number of questions
        filteredQuestions = filteredQuestions.slice(0, testConfig.questionCount)

        const formattedQuestions = filteredQuestions.map((q: any, index: number) => ({
          id: `q${index + 1}`,
          question: q.question,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        }))

        setQuestions(formattedQuestions)
        setTestStarted(true)
        setShowConfig(false)

        // Set timer based on question count (2 minutes per question)
        setTimeRemaining(formattedQuestions.length * 120)
      }
    } catch (error) {
      console.error("Error loading quiz data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const findTopicInMindMap = (mindMap: any[], topicId: string): any => {
    for (const topic of mindMap) {
      if (topic.id === topicId) return topic
      if (topic.children) {
        const found = findTopicInMindMap(topic.children, topicId)
        if (found) return found
      }
    }
    return null
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleAnswerChange = (answer: string) => {
    const currentQuestion = questions[currentQuestionIndex]
    const existingAnswerIndex = userAnswers.findIndex((a) => a.questionId === currentQuestion.id)

    if (existingAnswerIndex >= 0) {
      const newAnswers = [...userAnswers]
      newAnswers[existingAnswerIndex] = { questionId: currentQuestion.id, answer }
      setUserAnswers(newAnswers)
    } else {
      setUserAnswers([...userAnswers, { questionId: currentQuestion.id, answer }])
    }
  }

  const getCurrentAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex]
    const userAnswer = userAnswers.find((a) => a.questionId === currentQuestion.id)
    return userAnswer?.answer || ""
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmitTest = () => {
    const results = {
      topicId: params.topicId,
      topicName,
      subjectName,
      questions,
      userAnswers,
      completedAt: new Date().toISOString(),
      testConfig,
    }
    localStorage.setItem(`test-results-${params.topicId}`, JSON.stringify(results))
    setIsTestCompleted(true)
  }

  const startTest = () => {
    generateQuizQuestions()
  }

  // Test Configuration Screen
  if (showConfig && !testStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-2xl learning-card-premium">
          <CardHeader className="text-center">
            <Settings className="h-12 w-12 neon-accent mx-auto mb-4" />
            <CardTitle className="text-2xl">Configure Your Test</CardTitle>
            <p className="text-muted-foreground">
              {topicName} - {subjectName}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-3 block">Question Type</Label>
                <Select
                  value={testConfig.type}
                  onValueChange={(value: "mixed" | "mcq" | "short" | "long") =>
                    setTestConfig({ ...testConfig, type: value })
                  }
                >
                  <SelectTrigger className="premium-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed (All Types)</SelectItem>
                    <SelectItem value="mcq">Multiple Choice Only</SelectItem>
                    <SelectItem value="short">Short Answer Only</SelectItem>
                    <SelectItem value="long">Long Answer Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">Number of Questions</Label>
                <Input
                  type="number"
                  min="5"
                  max="50"
                  value={testConfig.questionCount}
                  onChange={(e) =>
                    setTestConfig({
                      ...testConfig,
                      questionCount: Math.min(50, Math.max(5, Number.parseInt(e.target.value) || 15)),
                    })
                  }
                  className="premium-input"
                />
                <p className="text-sm text-muted-foreground mt-2">Maximum 50 questions allowed</p>
              </div>

              <div className="bg-muted/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Test Details:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Type: {testConfig.type === "mixed" ? "Mixed Questions" : testConfig.type.toUpperCase()}</li>
                  <li>• Questions: {testConfig.questionCount}</li>
                  <li>• Time Limit: {Math.floor((testConfig.questionCount * 120) / 60)} minutes</li>
                  <li>• Auto-submit when time expires</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" className="premium-button-outline bg-transparent">
                  Cancel
                </Button>
              </Link>
              <Button onClick={startTest} disabled={isLoading} className="premium-button-neon">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Generating Test...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="neon-accent font-medium">Generating your personalized test...</p>
        </div>
      </div>
    )
  }

  if (isTestCompleted) {
    const score = userAnswers.filter((answer) => {
      const question = questions.find((q) => q.id === answer.questionId)
      return question && answer.answer === question.correctAnswer
    }).length

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-2xl learning-card-premium">
          <CardHeader className="text-center">
            <Brain className="h-12 w-12 neon-accent mx-auto mb-4" />
            <CardTitle className="text-2xl">Test Completed!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="text-4xl font-bold neon-accent">
              {score}/{questions.length}
            </div>
            <div className="text-xl">Score: {Math.round((score / questions.length) * 100)}%</div>
            <div className="flex justify-center space-x-4">
              <Link href={`/results/${params.topicId}`}>
                <Button className="premium-button-neon">
                  <Brain className="mr-2 h-4 w-4" />
                  View Detailed Results
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="premium-button-outline bg-transparent">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md learning-card-premium">
          <CardContent className="text-center p-8">
            <Brain className="h-12 w-12 neon-accent mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Quiz Available</h3>
            <p className="text-muted-foreground mb-4">Unable to generate quiz questions for this topic.</p>
            <Link href="/dashboard">
              <Button className="premium-button">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-background">
      {/* Test Header */}
      <div className="border-b bg-card border-border/20">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Brain className="h-6 w-6 neon-accent" />
              <div>
                <h1 className="text-xl font-bold">Test Mode</h1>
                <p className="text-sm text-muted-foreground">
                  {topicName} - {subjectName}
                </p>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-mono neon-accent font-semibold">{formatTime(timeRemaining)}</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="container px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="learning-card-premium">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Brain className="mr-2 h-5 w-5 neon-accent" />
                Question {currentQuestionIndex + 1}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-lg font-medium">{currentQuestion.question}</div>

              {currentQuestion.type === "mcq" && currentQuestion.options && (
                <RadioGroup value={getCurrentAnswer()} onValueChange={handleAnswerChange} className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="text-base cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {(currentQuestion.type === "short" || currentQuestion.type === "long") && (
                <Textarea
                  placeholder="Type your answer here..."
                  value={getCurrentAnswer()}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className={`premium-input ${currentQuestion.type === "long" ? "min-h-[200px]" : "min-h-[100px]"}`}
                />
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="premium-button-outline bg-transparent"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button onClick={handleSubmitTest} className="premium-button-neon">
                    Submit Test
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={nextQuestion} className="premium-button-neon">
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Question Navigator */}
          <Card className="mt-6 learning-card-premium">
            <CardHeader>
              <CardTitle className="text-base">Question Navigator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-10 gap-2">
                {questions.map((_, index) => {
                  const isAnswered = userAnswers.some((a) => a.questionId === questions[index].id)
                  const isCurrent = index === currentQuestionIndex

                  return (
                    <Button
                      key={index}
                      variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`aspect-square p-0 ${
                        isCurrent
                          ? "bg-foreground hover:bg-foreground/90 text-background"
                          : isAnswered
                            ? "bg-neon/10 text-neon border-neon/20"
                            : "border-border/30 hover:bg-muted/50"
                      }`}
                    >
                      {index + 1}
                    </Button>
                  )
                })}
              </div>
              <div className="flex items-center justify-center space-x-6 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-foreground rounded"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-neon/10 border border-neon/20 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border border-border/30 rounded"></div>
                  <span>Not Answered</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
