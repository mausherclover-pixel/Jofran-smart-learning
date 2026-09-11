import Image from 'next/image';
import Link from 'next/link';
import { GraduationCap, LineChart, MessagesSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LandingReveal } from '@/components/landing/landing-reveal';

const AUDIENCES = [
  { label: 'Students', detail: 'Grade 1–6 lessons, quizzes, and AI Teacher Jojo' },
  { label: 'Parents', detail: "Track your child's progress and message their teacher" },
  { label: 'Teachers', detail: 'Assign, grade, and see class-wide mastery at a glance' },
  { label: 'Principals & Admins', detail: 'School-wide oversight, staff and enrollment management' },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Teacher Jojo',
    body: 'One guided AI persona for reading, writing, listening and speaking practice — every conversation is visible to a teacher and guardian.',
  },
  {
    icon: LineChart,
    title: 'Adaptive difficulty',
    body: 'Every attempt updates a per-skill mastery score, so the next question is pitched exactly where a student needs it.',
  },
  {
    icon: MessagesSquare,
    title: 'Built for Timor-Leste',
    body: 'Tetum, English and Bahasa Indonesia as equal first-class languages — not one translated afterthought.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="Jofran E-Learning" width={36} height={36} className="rounded-md" />
            <span className="text-lg font-semibold text-primary">Jofran Smart Learning</span>
          </div>
          <nav className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <LandingReveal>
        <section className="container grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent-foreground">
              Grade 1–6 · Tetum · English · Bahasa Indonesia
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              AI-powered learning, built for <span className="text-primary">Timor-Leste</span>'s classrooms.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Jofran connects students, parents, teachers and school leadership in one platform — adaptive lessons, an AI
              tutor students can trust, and reports guardians actually read.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">Log in to your school</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#audiences">See who it's for</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src="/logo.jpg"
              alt="A student using Jofran Smart Learning"
              width={360}
              height={400}
              className="rounded-2xl shadow-lg"
              priority
            />
          </div>
        </section>
      </LandingReveal>

      <section id="audiences" className="border-t border-border bg-muted/40 py-16">
        <div className="container">
          <h2 className="mb-8 text-2xl font-semibold text-foreground">One platform, six roles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((a) => (
              <Card key={a.label}>
                <CardHeader>
                  <GraduationCap className="mb-2 h-6 w-6 text-secondary" />
                  <CardTitle className="text-base">{a.label}</CardTitle>
                  <CardDescription>{a.detail}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <h2 className="mb-8 text-2xl font-semibold text-foreground">What makes it Jofran</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardContent className="pt-6">
                  <f.icon className="mb-3 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Jofran Smart Learning — Timor-Leste.
      </footer>
    </main>
  );
}
