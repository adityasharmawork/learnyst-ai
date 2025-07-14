"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Crown, Trophy, Sparkles, Star, Award } from "lucide-react"
import confetti from "canvas-confetti"

interface CompletionModalProps {
  isOpen: boolean
  onClose: () => void
  subjectName: string
  totalTopics: number
}

export function CompletionModal({ isOpen, onClose, subjectName, totalTopics }: CompletionModalProps) {
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false)

  const triggerConfetti = () => {
    if (hasTriggeredConfetti) return
    setHasTriggeredConfetti(true)

    // Multiple confetti bursts
    const duration = 3000
    const end = Date.now() + duration

    const colors = ["#f59e0b", "#d97706", "#fcd34d", "#ffffff"]
    ;(function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    })()

    // Center burst
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors,
      })
    }, 500)
  }

  if (isOpen && !hasTriggeredConfetti) {
    setTimeout(triggerConfetti, 300)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md luxury-card completion-celebration">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-yellow-600 rounded-full flex items-center justify-center animate-scale-in">
            <Trophy className="w-10 h-10 text-white" />
          </div>

          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-yellow-600 bg-clip-text text-transparent">
            🎉 Congratulations! 🎉
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4 py-4">
          <div className="flex justify-center space-x-2 mb-4">
            <Star className="w-6 h-6 text-primary animate-pulse" />
            <Crown className="w-8 h-8 text-primary" />
            <Star className="w-6 h-6 text-primary animate-pulse" />
          </div>

          <h3 className="text-xl font-semibold text-foreground">
            You've mastered <span className="text-primary">{subjectName}</span>!
          </h3>

          <div className="bg-gradient-to-r from-primary/10 to-yellow-600/10 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Award className="w-5 h-5 text-primary" />
              <span className="font-semibold text-primary">Achievement Unlocked</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You've completed all <strong>{totalTopics} topics</strong> in this subject. Your dedication to learning is
              truly inspiring!
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground">🌟 You've shown exceptional commitment to your education</p>
            <p className="text-muted-foreground">📚 Ready to tackle your next learning challenge?</p>
          </div>

          <div className="flex items-center justify-center space-x-1 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Keep up the excellent work!</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={onClose} className="btn-premium text-white font-semibold px-8">
            Continue Learning Journey
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
