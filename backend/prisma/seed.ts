import { PrismaClient, Role, QuestionType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('ChangeMe123!');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@jofran.tl' },
    update: {},
    create: { role: Role.SUPER_ADMIN, email: 'super@jofran.tl', fullName: 'Jofran Super Admin', passwordHash },
  });

  const school = await prisma.school.upsert({
    where: { id: 'school-dili-pilot' },
    update: {},
    create: { id: 'school-dili-pilot', name: 'Eskola Primaria Dili Pilot', municipality: 'Dili', plan: 'PILOT' },
  });

  const [schoolAdmin, principal, teacher, parent] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@dili-pilot.jofran.tl' },
      update: {},
      create: { role: Role.SCHOOL_ADMIN, schoolId: school.id, email: 'admin@dili-pilot.jofran.tl', fullName: 'Ana Soares', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'principal@dili-pilot.jofran.tl' },
      update: {},
      create: { role: Role.PRINCIPAL, schoolId: school.id, email: 'principal@dili-pilot.jofran.tl', fullName: 'Domingos Ximenes', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'teacher@dili-pilot.jofran.tl' },
      update: {},
      create: { role: Role.TEACHER, schoolId: school.id, email: 'teacher@dili-pilot.jofran.tl', fullName: 'Maria Belo', passwordHash },
    }),
    prisma.user.upsert({
      where: { email: 'parent@dili-pilot.jofran.tl' },
      update: {},
      create: { role: Role.PARENT, schoolId: school.id, email: 'parent@dili-pilot.jofran.tl', fullName: 'Julia Fernandes', passwordHash },
    }),
  ]);

  const term = await prisma.academicTerm.upsert({
    where: { schoolId_year_name: { schoolId: school.id, year: 2026, name: 'Term 1' } },
    update: {},
    create: { schoolId: school.id, year: 2026, name: 'Term 1', startsOn: new Date('2026-01-12'), endsOn: new Date('2026-04-30') },
  });

  const klass = await prisma.class.upsert({
    where: { id: 'class-grade3-kamelia' },
    update: {},
    create: { id: 'class-grade3-kamelia', schoolId: school.id, academicTermId: term.id, grade: 3, name: 'Grade 3 — Kamelia', teacherId: teacher.id },
  });

  const student = await prisma.user.upsert({
    where: { username: 'delfina.s' },
    update: {},
    create: { role: Role.STUDENT, schoolId: school.id, fullName: 'Delfina Soares', username: 'delfina.s', passwordHash },
  });

  await prisma.enrollment.upsert({
    where: { classId_studentId: { classId: klass.id, studentId: student.id } },
    update: {},
    create: { classId: klass.id, studentId: student.id },
  });

  await prisma.guardianship.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    update: {},
    create: { parentId: parent.id, studentId: student.id, relation: 'parent' },
  });

  const subject = await prisma.subject.upsert({
    where: { slug: 'math-grade3' },
    update: {},
    create: { slug: 'math-grade3', grade: 3 },
  });

  const skill = await prisma.skill.upsert({
    where: { subjectId_code: { subjectId: subject.id, code: 'add-2digit' } },
    update: {},
    create: { subjectId: subject.id, code: 'add-2digit', name: 'Two-digit addition' },
  });

  const unit = await prisma.curriculumUnit.upsert({
    where: { subjectId_slug: { subjectId: subject.id, slug: 'unit-1-addition' } },
    update: {},
    create: { subjectId: subject.id, slug: 'unit-1-addition', order: 1 },
  });

  const lesson = await prisma.lesson.upsert({
    where: { id: 'lesson-addition-intro' },
    update: {},
    create: { id: 'lesson-addition-intro', unitId: unit.id, order: 1, published: true },
  });

  await Promise.all(
    [
      { locale: 'TET' as const, title: 'Aumenta ho Dois Numeru', bodyMarkdown: 'Ohin ita aprende oinsa aumenta numeru rua...' },
      { locale: 'EN' as const, title: 'Adding Two Numbers', bodyMarkdown: 'Today we learn how to add two numbers...' },
      { locale: 'ID' as const, title: 'Menjumlahkan Dua Angka', bodyMarkdown: 'Hari ini kita belajar menjumlahkan dua angka...' },
    ].map((v) =>
      prisma.lessonLocale.upsert({
        where: { lessonId_locale: { lessonId: lesson.id, locale: v.locale } },
        update: {},
        create: { lessonId: lesson.id, ...v, mediaKeys: [], aiDrafted: false },
      }),
    ),
  );

  const assessment = await prisma.assessment.upsert({
    where: { id: 'assessment-addition-quiz-1' },
    update: {},
    create: {
      id: 'assessment-addition-quiz-1',
      classId: klass.id,
      lessonId: lesson.id,
      authorId: teacher.id,
      type: 'QUIZ',
      title: 'Addition Quiz 1',
      publishedAt: new Date(),
      questions: {
        create: [
          {
            order: 0,
            type: QuestionType.MULTIPLE_CHOICE,
            promptMarkdown: 'What is 24 + 15?',
            choices: [
              { id: 'a', label: '39' },
              { id: 'b', label: '29' },
              { id: 'c', label: '41' },
            ],
            correctAnswer: 'a',
            skillId: skill.id,
            points: 1,
          },
          {
            order: 1,
            type: QuestionType.CONSTRUCTED_RESPONSE,
            promptMarkdown: 'Explain, in your own words, how you add two two-digit numbers.',
            rubric: 'Award full points if the student describes lining up ones and tens and carrying correctly.',
            skillId: skill.id,
            points: 2,
          },
        ],
      },
    },
  });

  console.log('Seeded:', {
    superAdmin: superAdmin.email,
    school: school.name,
    schoolAdmin: schoolAdmin.email,
    principal: principal.email,
    teacher: teacher.email,
    parent: parent.email,
    student: student.username,
    assessment: assessment.title,
  });
  console.log('All seeded passwords: ChangeMe123!');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
