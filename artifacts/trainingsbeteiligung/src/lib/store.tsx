import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Player, Season, Team, TrainingSession } from './types';
import { generateInitialData } from './initial-data';

type StoreContextType = {
  state: AppState;
  setActiveTeam: (id: string) => void;
  setActiveSeason: (id: string) => void;
  
  addPlayer: (player: Omit<Player, 'id'>) => void;
  updatePlayer: (id: string, player: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  
  addSession: (session: Omit<TrainingSession, 'id'>) => void;
  updateSession: (id: string, session: Partial<TrainingSession>) => void;
  deleteSession: (id: string) => void;
  
  addTeam: (team: Omit<Team, 'id'>) => void;
  updateTeam: (id: string, team: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  
  addSeason: (season: Omit<Season, 'id'>) => void;
  updateSeason: (id: string, season: Partial<Season>) => void;
  deleteSeason: (id: string) => void;
};

const StoreContext = createContext<StoreContextType | null>(null);

const STORAGE_KEY = 'trainingsbeteiligung_data';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse localStorage data', e);
      }
    }
    return generateInitialData();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => updater(prev));
  };

  const generateId = () => crypto.randomUUID();

  const ctx: StoreContextType = {
    state,
    setActiveTeam: (id) => updateState(s => ({ ...s, activeTeamId: id })),
    setActiveSeason: (id) => updateState(s => ({ ...s, activeSeasonId: id })),
    
    addPlayer: (p) => updateState(s => ({ ...s, players: [...s.players, { ...p, id: generateId() }] })),
    updatePlayer: (id, p) => updateState(s => ({ ...s, players: s.players.map(x => x.id === id ? { ...x, ...p } : x) })),
    deletePlayer: (id) => updateState(s => ({ ...s, players: s.players.filter(x => x.id !== id) })),
    
    addSession: (session) => updateState(s => ({ ...s, sessions: [...s.sessions, { ...session, id: generateId() }] })),
    updateSession: (id, session) => updateState(s => ({ ...s, sessions: s.sessions.map(x => x.id === id ? { ...x, ...session } : x) })),
    deleteSession: (id) => updateState(s => ({ ...s, sessions: s.sessions.filter(x => x.id !== id) })),
    
    addTeam: (t) => updateState(s => ({ ...s, teams: [...s.teams, { ...t, id: generateId() }] })),
    updateTeam: (id, t) => updateState(s => ({ ...s, teams: s.teams.map(x => x.id === id ? { ...x, ...t } : x) })),
    deleteTeam: (id) => updateState(s => ({ ...s, teams: s.teams.filter(x => x.id !== id) })),
    
    addSeason: (season) => updateState(s => ({ ...s, seasons: [...s.seasons, { ...season, id: generateId() }] })),
    updateSeason: (id, season) => updateState(s => ({ ...s, seasons: s.seasons.map(x => x.id === id ? { ...x, ...season } : x) })),
    deleteSeason: (id) => updateState(s => ({ ...s, seasons: s.seasons.filter(x => x.id !== id) })),
  };

  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
}
