import { Question, Answer, QUESTION_BANKS } from "../types/questionBank";
import { ProjectCategory } from "../types/pim";
import { buildPerspectivesQuestion } from "./perspectives";

export interface QuestionnaireState {
  category: ProjectCategory;
  answers: Answer[];
  currentIndex: number;
  complete: boolean;
}

/**
 * Get all questions for a category.
 */
export function getQuestionsForCategory(category: ProjectCategory): Question[] {
  const base = QUESTION_BANKS[category] || [];
  return [...base, buildPerspectivesQuestion(category)];
}

/**
 * Get the current question based on answers so far.
 */
export function getCurrentQuestion(state: QuestionnaireState): Question | null {
  const questions = getQuestionsForCategory(state.category);
  if (state.currentIndex >= questions.length) {
    return null;
  }
  return questions[state.currentIndex];
}

/**
 * Process an answer and advance to the next question.
 */
export function processAnswer(
  state: QuestionnaireState,
  questionId: string,
  value: string
): QuestionnaireState {
  const questions = getQuestionsForCategory(state.category);
  const question = questions.find(q => q.id === questionId);
  
  if (!question) {
    return state;
  }

  const answer: Answer = {
    questionId,
    value: value || question.default,
    skipped: !value
  };

  const newAnswers = [...state.answers];
  const existingIndex = newAnswers.findIndex(a => a.questionId === questionId);
  if (existingIndex >= 0) {
    newAnswers[existingIndex] = answer;
  } else {
    newAnswers.push(answer);
  }

  const newIndex = state.currentIndex + 1;
  
  return {
    ...state,
    answers: newAnswers,
    currentIndex: newIndex,
    complete: newIndex >= questions.length
  };
}

/**
 * Skip the current question and use the default value.
 */
export function skipQuestion(state: QuestionnaireState): QuestionnaireState {
  const question = getCurrentQuestion(state);
  if (!question) {
    return state;
  }
  return processAnswer(state, question.id, "");
}

/**
 * Go back to the previous question.
 */
export function goBack(state: QuestionnaireState): QuestionnaireState {
  if (state.currentIndex <= 0) {
    return state;
  }
  return {
    ...state,
    currentIndex: state.currentIndex - 1,
    complete: false
  };
}

/**
 * Get progress as a percentage.
 */
export function getProgress(state: QuestionnaireState): { answered: number; total: number; percentage: number } {
  const questions = getQuestionsForCategory(state.category);
  const answered = state.answers.filter(a => !a.skipped).length;
  return {
    answered,
    total: questions.length,
    percentage: Math.round((state.currentIndex / questions.length) * 100)
  };
}

/**
 * Get the answer for a specific question.
 */
export function getAnswer(state: QuestionnaireState, questionId: string): Answer | undefined {
  return state.answers.find(a => a.questionId === questionId);
}

/**
 * Initialize a new questionnaire for a category.
 */
export function initQuestionnaire(category: ProjectCategory): QuestionnaireState {
  return {
    category,
    answers: [],
    currentIndex: 0,
    complete: false
  };
}
