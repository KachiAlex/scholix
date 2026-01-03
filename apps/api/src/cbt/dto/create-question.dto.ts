export type CreateQuestionDto = {
  subjectId?: string;
  text: string;
  options: { text: string; isCorrect?: boolean }[];
};
