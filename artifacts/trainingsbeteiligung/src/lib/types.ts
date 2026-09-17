export type Team = {
  id: string;
  name: string;
};

export type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type Player = {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  activeFrom: string;
  activeTo?: string;
};

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'injured';

export type Attendance = {
  playerId: string;
  status: AttendanceStatus;
  note?: string;
};

export type TrainingSession = {
  id: string;
  teamId: string;
  seasonId: string;
  date: string;
  attendances: Attendance[];
};

export type AppState = {
  teams: Team[];
  seasons: Season[];
  players: Player[];
  sessions: TrainingSession[];
  activeTeamId: string | null;
  activeSeasonId: string | null;
};
