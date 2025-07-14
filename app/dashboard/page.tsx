"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, BookOpen, Brain, TrendingUp, Info, CheckCircle, Sparkles } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"

interface Subject {
  id: string
  name: string
  progress: number
  totalTopics: number
  completedTopics: number
  mindMap?: any[]
}

export default function Dashboard() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newSubject, setNewSubject] = useState({ name: "", syllabus: "" })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [fallbackMessage, setFallbackMessage] = useState("")
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const savedSubjects = localStorage.getItem("Learnyst-subjects")
    if (savedSubjects) {
      setSubjects(JSON.parse(savedSubjects))
    }
  }, [])

  useEffect(() => {
    if (subjects.length > 0) {
      localStorage.setItem("Learnyst-subjects", JSON.stringify(subjects))
    }
  }, [subjects])

  const handleCreateSubject = async () => {
    if (!newSubject.name || !newSubject.syllabus) {
      setError("Please provide both subject name and syllabus content")
      return
    }

    setIsGenerating(true)
    setError("")
    setFallbackMessage("")

    try {
      const response = await fetch("/api/gemini/analyze-syllabus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subjectName: newSubject.name,
          syllabus: newSubject.syllabus,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze syllabus")
      }

      const subject: Subject = {
        id: Date.now().toString(),
        name: newSubject.name,
        progress: 0,
        totalTopics: data.totalTopics,
        completedTopics: 0,
        mindMap: data.mindMap,
      }

      setSubjects([...subjects, subject])
      setNewSubject({ name: "", syllabus: "" })
      setIsDialogOpen(false)

      if (data.fallback) {
        setFallbackMessage(data.message)
      }
    } catch (error) {
      console.error("Error creating subject:", error)

      const fallbackSubject: Subject = {
        id: Date.now().toString(),
        name: newSubject.name,
        progress: 0,
        totalTopics: 19,
        completedTopics: 0,
        mindMap: generateLocalFallbackMindMap(newSubject.name, newSubject.syllabus),
      }

      setSubjects([...subjects, fallbackSubject])
      setNewSubject({ name: "", syllabus: "" })
      setIsDialogOpen(false)
      setFallbackMessage(
        "Subject created with structured learning framework. AI enhancement available when service is restored.",
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const generateLocalFallbackMindMap = (subjectName: string, syllabus: string) => {
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
        ],
      },
    ]
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/10 pointer-events-none" />
      <div className="absolute top-20 right-20 w-96 h-96 bg-neon/3 rounded-full blur-3xl floating-premium" />
      <div
        className="absolute bottom-20 left-20 w-80 h-80 bg-foreground/3 rounded-full blur-3xl floating-premium"
        style={{ animationDelay: "4s" }}
      />

      {/* Header */}
      <header className="nav-premium">
        <div className="container-premium">
          <div className="flex h-20 items-center justify-between">
            <div
              className={`flex items-center space-x-4 transition-all duration-700 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}
            >
              <Link href="/" className="flex items-center space-x-4">
                <div className="brand-logo">
                  <span className="text-background font-bold text-lg">L</span>
                </div>
                <span className="brand-text">Learnyst</span>
              </Link>
            </div>

            <div
              className={`flex items-center space-x-6 transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
            >
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="container-premium py-16">
        {/* Welcome Section */}
        <div
          className={`mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="flex items-center mb-6">
            <h1 className="text-premium-1 font-bold">Learning Dashboard</h1>
            <Sparkles className="ml-6 h-12 w-12 neon-accent pulse-neon" />
          </div>
          <p className="text-premium-5 max-w-3xl leading-relaxed">
            <span className="neon-accent">
              Manage your subjects, track progress, and access AI-powered study materials from your centralized learning
              command center.
            </span>
          </p>
        </div>

        {/* Fallback Message */}
        {fallbackMessage && (
          <Alert className="mb-12 premium-card border-neon/20 bg-neon/5">
            <Info className="h-5 w-5" />
            <AlertDescription className="text-base">{fallbackMessage}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div
          className={`grid gap-8 md:grid-cols-3 mb-16 transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <Card className="premium-card interactive-premium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold text-muted-foreground">Total Subjects</CardTitle>
              <BookOpen className="h-6 w-6 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-premium-3 font-bold">{subjects.length}</div>
              <p className="text-caption-premium mt-2">Active learning paths</p>
            </CardContent>
          </Card>

          <Card className="premium-card interactive-premium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold text-muted-foreground">Average Progress</CardTitle>
              <TrendingUp className="h-6 w-6 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-premium-3 font-bold">
                <span className="neon-accent">
                  {subjects.length > 0
                    ? Math.round(subjects.reduce((acc, s) => acc + s.progress, 0) / subjects.length)
                    : 0}
                  %
                </span>
              </div>
              <p className="text-caption-premium mt-2">Across all subjects</p>
            </CardContent>
          </Card>

          <Card className="premium-card interactive-premium">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold text-muted-foreground">Topics Completed</CardTitle>
              <Brain className="h-6 w-6 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-premium-3 font-bold">{subjects.reduce((acc, s) => acc + s.completedTopics, 0)}</div>
              <p className="text-caption-premium mt-2">
                of {subjects.reduce((acc, s) => acc + s.totalTopics, 0)} total topics
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add New Subject */}
        <div
          className={`mb-16 transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="premium-button-neon text-lg px-12 py-6 font-bold">
                <Plus className="mr-3 h-6 w-6" />
                Add New Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] premium-card border-0">
              <DialogHeader>
                <DialogTitle className="flex items-center text-premium-4 font-bold">
                  <Brain className="mr-4 h-8 w-8 neon-accent" />
                  Create Learning Path
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-8 pt-6">
                <div className="form-group-premium">
                  <Label htmlFor="subject-name" className="form-label-premium">
                    Subject Name
                  </Label>
                  <Input
                    id="subject-name"
                    placeholder="e.g., Advanced Mathematics, Computer Science, Biology"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    className="premium-input text-base h-14"
                  />
                </div>
                <div className="form-group-premium">
                  <Label htmlFor="syllabus" className="form-label-premium">
                    Syllabus Content
                  </Label>
                  <Textarea
                    id="syllabus"
                    placeholder="Paste your complete syllabus here, or describe the topics you want to learn. The more detailed, the better the learning structure..."
                    className="premium-input min-h-[180px] resize-none text-base"
                    value={newSubject.syllabus}
                    onChange={(e) => setNewSubject({ ...newSubject, syllabus: e.target.value })}
                  />
                </div>
                {error && <div className="form-error-premium text-base">{error}</div>}
                <Button
                  onClick={handleCreateSubject}
                  disabled={!newSubject.name || !newSubject.syllabus || isGenerating}
                  className="w-full premium-button-neon text-lg py-6 font-bold"
                >
                  {isGenerating ? (
                    <>
                      <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating learning structure...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-3 h-5 w-5" />
                      Generate Learning Path
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Subjects Grid */}
        <div
          className={`grid gap-8 md:grid-cols-2 lg:grid-cols-3 transition-all duration-1000 delay-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {subjects.map((subject, index) => (
            <Link key={subject.id} href={`/learning-hub/${subject.id}`}>
              <Card className="premium-card interactive-premium h-full">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-premium-5 font-bold">{subject.name}</span>
                    <BookOpen className="h-6 w-6 text-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-base mb-3">
                        <span className="text-muted-foreground font-medium">Progress</span>
                        <span className="font-bold neon-accent">{subject.progress}%</span>
                      </div>
                      <div className="progress-premium">
                        <div className="progress-fill-premium bg-neon" style={{ width: `${subject.progress}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-base">
                      <span className="text-muted-foreground">
                        {subject.completedTopics} of {subject.totalTopics} topics
                      </span>
                      {subject.progress === 100 && <CheckCircle className="h-5 w-5 neon-accent pulse-neon" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {subjects.length === 0 && (
          <div
            className={`text-center py-24 transition-all duration-1000 delay-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <Card className="premium-card max-w-2xl mx-auto p-16">
              <CardContent className="p-0 text-center">
                <div className="w-20 h-20 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-8">
                  <Brain className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-premium-4 mb-6 font-bold">No subjects yet</h3>
                <p className="text-body-premium text-muted-foreground mb-12 leading-relaxed max-w-md mx-auto">
                  Create your first learning path to get started with structured studying and AI-powered materials
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="premium-button-neon text-lg px-12 py-6 font-bold"
                >
                  <Plus className="mr-3 h-5 w-5" />
                  Create First Subject
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
