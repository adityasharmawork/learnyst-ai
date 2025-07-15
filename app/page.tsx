"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Brain, BookOpen, Target, Zap, Trophy, ArrowRight, Play, TrendingUp, Sparkles } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view")
          }
        })
      },
      { threshold: 0.1 },
    )

    const elements = document.querySelectorAll(".fade-in-premium")
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none" />
      <div className="absolute top-20 right-20 w-96 h-96 bg-neon/5 rounded-full blur-3xl floating-premium" />
      <div
        className="absolute bottom-20 left-20 w-80 h-80 bg-foreground/5 rounded-full blur-3xl floating-premium"
        style={{ animationDelay: "3s" }}
      />

      {/* Navigation */}
      <nav className="nav-premium sticky top-0 z-50">
        <div className="container-premium">
          <div className="flex h-20 items-center justify-between">
            <div
              className={`flex items-center space-x-4 transition-all duration-700 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}
            >
              <div className="brand-logo">
                <span className="text-background font-bold text-lg">L</span>
              </div>
              <span className="brand-text">Learnyst AI</span>
            </div>

            <div className="hidden md:flex items-center space-x-12">
              <Link href="#features" className="nav-link-premium">
                Features
              </Link>
              <Link href="#how-it-works" className="nav-link-premium">
                How it Works
              </Link>
              <Link href="#faq" className="nav-link-premium">
                FAQ
              </Link>
            </div>

            <div
              className={`flex items-center space-x-6 transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
            >
              {/* <ThemeToggle /> */}
              <Link href="/dashboard">
                <Button className="premium-button-neon">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section-premium">
        <div className="container-premium">
          <div className="max-w-5xl mx-auto text-center">
            <div
              className={`mb-8 transition-all duration-1000 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            >
              <div className="inline-flex items-center glass-effect rounded-full px-6 py-3 text-sm font-medium">
                <Sparkles className="mr-2 h-4 w-4 neon-accent" />
                <span className="neon-accent">AI-Powered Learning Revolution</span>
              </div>
            </div>

            <h1
              className={`text-premium-1 mb-8 transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              Transform Your Learning with <span className="neon-accent">Intelligent Precision</span>
            </h1>

            <p
              className={`text-premium-5 mb-12 max-w-3xl mx-auto leading-relaxed transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <span className="neon-accent">
                Learnyst leverages advanced AI to transform your syllabus into structured learning paths, generate
                comprehensive study materials, and track your progress with unmatched precision.
              </span>
            </p>

            <div
              className={`flex flex-col sm:flex-row gap-6 justify-center items-center transition-all duration-1000 delay-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <Link href="/dashboard">
                <Button size="lg" className="premium-button-neon text-lg px-12 py-6 font-bold">
                  Start Learning Now
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="premium-button-outline text-lg px-12 py-6 bg-transparent">
                <Play className="mr-3 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div
              className={`mt-24 grid grid-cols-1 md:grid-cols-2 gap-12 transition-all duration-1000 delay-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              {/* <div className="text-center">
                <div className="text-premium-2 font-bold mb-3">10,000+</div>
                <div className="text-caption-premium">Active Students</div>
              </div> */}
              <div className="text-center">
                <div className="text-premium-2 font-bold mb-3">
                  <span className="neon-accent">95%</span>
                </div>
                <div className="text-caption-premium">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-premium-2 font-bold mb-3">24/7</div>
                <div className="text-caption-premium">AI Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-premium bg-muted/20">
        <div className="container-premium">
          <div className="max-w-4xl mx-auto text-center mb-20 fade-in-premium">
            <h2 className="text-premium-2 mb-6">Comprehensive Learning Ecosystem</h2>
            <p className="text-premium-5 text-muted-foreground">
              Advanced AI tools engineered for accelerated learning and knowledge mastery
            </p>
          </div>

          <div className="grid-premium md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {[
              {
                icon: Brain,
                title: "Intelligent Syllabus Analysis",
                description:
                  "Transform any curriculum into structured learning paths with comprehensive topic mapping and dependency analysis",
              },
              {
                icon: BookOpen,
                title: "Automated Content Generation",
                description:
                  "Generate detailed notes, summaries, and study guides tailored to your specific learning objectives",
              },
              {
                icon: Target,
                title: "Adaptive Learning System",
                description: "Smart flashcard system with spaced repetition algorithms for optimal knowledge retention",
              },
              {
                icon: Zap,
                title: "Dynamic Assessment Engine",
                description:
                  "AI-generated quizzes and tests that adapt to your learning progress and identify weak areas",
              },
              {
                icon: TrendingUp,
                title: "Advanced Analytics",
                description:
                  "Comprehensive insights and performance metrics to track your learning journey effectively",
              },
              {
                icon: Trophy,
                title: "Exam Simulation Suite",
                description:
                  "Realistic exam environment with detailed performance analysis and improvement recommendations",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="premium-card p-8 interactive-premium fade-in-premium"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-0">
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-foreground/5 border border-border/30">
                    <feature.icon className="h-8 w-8 text-foreground" />
                  </div>
                  <h3 className="text-premium-5 mb-4 font-bold">{feature.title}</h3>
                  <p className="text-body-premium text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="section-premium">
        <div className="container-premium">
          <div className="max-w-4xl mx-auto text-center mb-20 fade-in-premium">
            <h2 className="text-premium-2 mb-6">Streamlined Three-Step Process</h2>
            <p className="text-premium-5 text-muted-foreground">Get started with intelligent learning in minutes</p>
          </div>

          <div className="grid-premium md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Upload & Analyze",
                description: "Provide your syllabus or study materials through our intuitive interface for AI analysis",
              },
              {
                step: "02",
                title: "AI Processing",
                description:
                  "Our advanced algorithms process and structure your content into optimal learning pathways",
              },
              {
                step: "03",
                title: "Learn & Excel",
                description: "Access personalized study materials, assessments, and track your progress in real-time",
              },
            ].map((step, index) => (
              <div key={index} className="text-center fade-in-premium" style={{ transitionDelay: `${index * 200}ms` }}>
                <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full border-2 border-foreground text-premium-4 font-bold">
                  {step.step}
                </div>
                <h3 className="text-premium-5 mb-4 font-bold">{step.title}</h3>
                <p className="text-body-premium text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-premium bg-muted/20">
        <div className="container-premium">
          <div className="max-w-4xl mx-auto text-center mb-20 fade-in-premium">
            <h2 className="text-premium-2 mb-6">Trusted by Students Worldwide</h2>
            <p className="text-premium-5 text-muted-foreground">See how Learnyst is transforming education globally</p>
          </div>

          <div className="grid-premium md:grid-cols-3 max-w-6xl mx-auto">
            {[
              {
                quote:
                  "Learnyst revolutionized my study routine. The AI-generated materials are comprehensive and perfectly structured for my learning style.",
                author: "Sarah Chen",
                role: "Medical Student",
              },
              {
                quote:
                  "The progress tracking and adaptive quizzes helped me identify weak areas and improve systematically. Game-changing technology.",
                author: "Marcus Rodriguez",
                role: "Engineering Student",
              },
              {
                quote:
                  "I love how it breaks down complex syllabi into manageable learning paths. Highly recommended for serious students.",
                author: "Aisha Patel",
                role: "Business Student",
              },
            ].map((testimonial, index) => (
              <Card
                key={index}
                className="premium-card p-8 fade-in-premium"
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <CardContent className="p-0">
                  <div className="mb-6 flex">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-5 h-5 bg-foreground rounded-full mr-1"></div>
                    ))}
                  </div>
                  <blockquote className="text-body-premium mb-6 italic leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div>
                    <div className="font-bold text-foreground">{testimonial.author}</div>
                    <div className="text-caption-premium">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section-premium">
        <div className="container-premium">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20 fade-in-premium">
              <h2 className="text-premium-2 mb-6">Frequently Asked Questions</h2>
              <p className="text-premium-5 text-muted-foreground">Everything you need to know about Learnyst</p>
            </div>

            <Accordion type="single" collapsible className="space-y-6 fade-in-premium">
              {[
                {
                  question: "How does Learnyst's AI technology work?",
                  answer:
                    "Learnyst uses advanced natural language processing and machine learning algorithms to analyze your syllabus and study materials, then generates structured learning paths, comprehensive notes, and adaptive assessments tailored to your specific curriculum and learning style.",
                },
                {
                  question: "Is my data secure and private?",
                  answer:
                    "Absolutely. We prioritize data security with enterprise-grade encryption and secure storage. All your study materials and progress are protected, and we never share your personal information with third parties.",
                },
                {
                  question: "Can Learnyst work with any subject or curriculum?",
                  answer:
                    "Yes, Learnyst is designed to work with any subject matter, from STEM fields to humanities, languages, and professional certifications. Our AI adapts to create relevant content for any academic domain.",
                },
                {
                  question: "Is there a free trial available?",
                  answer:
                    "Yes, you can start using Learnyst immediately with our comprehensive free tier. Experience the full power of AI-powered learning without any upfront commitment.",
                },
              ].map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="premium-card border-0 px-8">
                  <AccordionTrigger className="text-left font-bold text-lg py-8 hover:no-underline hover:text-neon transition-colors duration-300">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-8 leading-relaxed text-base">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-premium bg-muted/30">
        <div className="container-premium text-center fade-in-premium">
          <h2 className="text-premium-2 mb-6">Ready to Transform Your Learning?</h2>
          <p className="text-premium-5 mb-12 max-w-3xl mx-auto text-muted-foreground leading-relaxed">
            Join thousands of students who are already learning more effectively with Learnyst's advanced AI technology
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="premium-button-neon text-lg px-12 py-6 font-bold">
              Start Learning Today
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-20 bg-background">
        <div className="container-premium">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <div className="brand-logo">
                  <span className="text-background font-bold text-lg">L</span>
                </div>
                <span className="brand-text">Learnyst AI</span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                Professional AI-powered learning platform engineered for students and educators worldwide.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-6 text-lg">Product</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li>
                  <Link href="#features" className="hover:text-foreground transition-colors duration-300">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="hover:text-foreground transition-colors duration-300">
                    How it Works
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="hover:text-foreground transition-colors duration-300">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-6 text-lg">Company</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors duration-300">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors duration-300">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors duration-300">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          
        </div>
      </footer>
    </div>
  )
}
