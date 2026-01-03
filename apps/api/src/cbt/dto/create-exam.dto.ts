export type CreateExamDto = {
  name: string;
  classId: string;
  subjectId?: string;
  sessionId?: string;
  termId?: string;
  durationMinutes: number;
  startsAt?: string;
  endsAt?: string;
  questionIds?: string[];
};
