export type ScoreLevel = 'red' | 'orange' | 'green';
export type Language = 'en' | 'zh';

export interface Settings {
  defaultLanguage: Language;
  enabled: boolean;
}

export interface Assessment {
  score: ScoreLevel;
  explanation: string;
  missingContext: string[];
  timestamp: number;
}

export interface Message<T = any> {
  type: MessageType;
  payload: T;
  requestId?: string;
}

export type MessageType =
  | 'ASSESS_PROMPT'
  | 'ASSESSMENT_RESULT'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'ERROR';
