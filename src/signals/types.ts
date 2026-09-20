export interface DeploySignals {
  time: TimeSignal;
  git: GitSignal;
  diff: DiffSignal;
  tests: TestSignal;
  env: EnvSignal;
}

export interface TimeSignal {
  isoLocal: string;
  weekday: string;
  hour24: number;
  isFriday: boolean;
  isWeekend: boolean;
  isAfterHours: boolean;
  timezone: string;
}

export interface GitSignal {
  branch: string;
  headSha: string;
  isDirty: boolean;
  dirtyFiles: number;
  recentCommits: Array<{ sha: string; author: string; subject: string; date: string }>;
  ahead: number;
  behind: number;
}

export interface DiffSignal {
  filesChanged: number;
  insertions: number;
  deletions: number;
  touchedPaths: string[];
  touchesInfra: boolean;
  touchesMigrations: boolean;
  touchesAuth: boolean;
  touchesPayments: boolean;
  touchesConfig: boolean;
}

export interface TestSignal {
  ran: boolean;
  passed: boolean;
  command: string | null;
  exitCode: number | null;
  output: string | null;
}

export interface EnvSignal {
  target: string;
  ciDetected: boolean;
  ciName: string | null;
}
