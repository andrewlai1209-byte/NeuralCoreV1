/**
 * Storage & Database utility layer for Aetheris Chess.
 * Manages user authentication, personal profiles, saved chess games, and weakness analysis.
 */

export interface SavedGame {
  id: string;
  date: string;
  opponent: string;
  opponentType: 'ai' | 'human' | 'import';
  timeControl: string;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  moves: string[]; // FEN or move strings
  pgn?: string;
  fenHistory?: string[]; // To allow move-by-move replay
  createdAt: number;
}

export interface UserProfile {
  username: string;
  avatar: string;
  title: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

const DEFAULT_PROFILE: UserProfile = {
  username: 'Grandmaster Guest',
  avatar: '👤',
  title: 'Candidate Master',
  rating: 1500,
  wins: 8,
  losses: 6,
  draws: 3,
};

// Key definitions
const KEYS = {
  USERS: 'AETHERIS_USERS_V2',
  SESSION: 'AETHERIS_SESSION_V2',
  GAMES: 'AETHERIS_SAVED_GAMES_V2',
};

// Retrieve all local accounts
export function getAccounts(): Record<string, { profile: UserProfile; password?: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEYS.USERS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error reading accounts', e);
    return {};
  }
}

// Retrieve active session user
export function getSessionUser(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(KEYS.SESSION);
    if (raw) {
      return JSON.parse(raw);
    }
    // Setup default guest profile if none exists
    localStorage.setItem(KEYS.SESSION, JSON.stringify(DEFAULT_PROFILE));
    return DEFAULT_PROFILE;
  } catch (e) {
    return DEFAULT_PROFILE;
  }
}

// Save active session user
export function saveSessionUser(profile: UserProfile) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(profile));
    
    // Also update in accounts list
    const accounts = getAccounts();
    if (accounts[profile.username]) {
      accounts[profile.username].profile = profile;
      localStorage.setItem(KEYS.USERS, JSON.stringify(accounts));
    }
  } catch (e) {
    console.error('Error saving session', e);
  }
}

// Perform simulated login or registration
export function loginUser(username: string, password?: string): UserProfile {
  const accounts = getAccounts();
  const normalized = username.trim();
  
  if (accounts[normalized]) {
    // Return existing profile
    const user = accounts[normalized].profile;
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    return user;
  } else {
    // Register new profile
    const newProfile: UserProfile = {
      username: normalized,
      avatar: ['🦁', '🦊', '🦅', '🦉', '🐉', '🐙', '🛡️', '⚔️'][Math.floor(Math.random() * 8)],
      title: 'New Contender',
      rating: 1200,
      wins: 0,
      losses: 0,
      draws: 0,
    };
    accounts[normalized] = { profile: newProfile, password };
    localStorage.setItem(KEYS.USERS, JSON.stringify(accounts));
    localStorage.setItem(KEYS.SESSION, JSON.stringify(newProfile));
    return newProfile;
  }
}

// Log out and reset session to guest
export function logoutUser() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.SESSION, JSON.stringify(DEFAULT_PROFILE));
}

// Retrieve saved games for the active profile
export function getSavedGames(): SavedGame[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.GAMES);
    const games: SavedGame[] = raw ? JSON.parse(raw) : [];
    return games.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error('Error reading saved games', e);
    return [];
  }
}

// Save a new game to the database
export function saveGame(game: Omit<SavedGame, 'id' | 'createdAt'>): SavedGame {
  const games = getSavedGames();
  const newGame: SavedGame = {
    ...game,
    id: 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    createdAt: Date.now(),
  };
  
  games.push(newGame);
  localStorage.setItem(KEYS.GAMES, JSON.stringify(games));
  
  // Update stats on saved game
  const session = getSessionUser();
  if (game.result === '1-0') {
    session.wins += 1;
    session.rating += 15;
  } else if (game.result === '0-1') {
    session.losses += 1;
    session.rating = Math.max(100, session.rating - 12);
  } else {
    session.draws += 1;
    session.rating += 2;
  }
  
  // Update title based on rating
  if (session.rating >= 2200) session.title = 'Grandmaster';
  else if (session.rating >= 2000) session.title = 'National Master';
  else if (session.rating >= 1800) session.title = 'Expert';
  else if (session.rating >= 1500) session.title = 'Candidate Master';
  else session.title = 'Class Player';

  saveSessionUser(session);
  return newGame;
}

// Delete a game by id
export function deleteGame(id: string) {
  const games = getSavedGames();
  const filtered = games.filter(g => g.id !== id);
  localStorage.setItem(KEYS.GAMES, JSON.stringify(filtered));
}

// Perform detailed Weakness & Strength analysis on saved games
export interface WeaknessAnalysis {
  openingsWeakness: string;
  endgameWeakness: string;
  timeWeakness: string;
  overallTactics: number; // 0-100 rating
  overallDefenses: number; // 0-100 rating
  suggestions: string[];
}

export function analyzeWeaknesses(games: SavedGame[], profile: UserProfile): WeaknessAnalysis {
  const total = games.length;
  if (total === 0) {
    return {
      openingsWeakness: 'Insufficent game data to map opening anomalies.',
      endgameWeakness: 'Endgame blunders unassessed.',
      timeWeakness: 'No time-budget bottlenecks identified.',
      overallTactics: 70,
      overallDefenses: 68,
      suggestions: [
        'Play a few games vs AI to populate tactical heatmaps.',
        'Study tactical patterns like forks and pins in the Analysis Lab.',
        'Try different AI Speeds to push your time-budget limits.'
      ]
    };
  }

  let shortGamesCount = 0;
  let shortLosses = 0;
  let longGamesCount = 0;
  let longLosses = 0;
  let aiLosses = 0;
  let tacticalLosses = 0;
  
  games.forEach(g => {
    const moveCount = g.moves.length;
    const isLoss = g.result === '0-1'; // assuming user is White
    
    if (moveCount < 16) {
      shortGamesCount++;
      if (isLoss) shortLosses++;
    } else if (moveCount > 40) {
      longGamesCount++;
      if (isLoss) longLosses++;
    }
    
    if (g.opponent.includes('AI') && isLoss) {
      aiLosses++;
    }
  });

  const openingRatio = shortGamesCount > 0 ? shortLosses / shortGamesCount : 0;
  const endgameRatio = longGamesCount > 0 ? longLosses / longGamesCount : 0;

  const openingsWeakness = openingRatio > 0.4 
    ? 'Prone to early traps. Often suffers development lag or direct King-side threats in the first 10-15 moves.'
    : 'Solid opening repertoire. Maintains strategic center-pawn tension successfully.';

  const endgameWeakness = endgameRatio > 0.4
    ? 'Endgame transition collapse. Struggles in simplified major-piece or minor-piece technical endings.'
    : 'Resourceful endgames. Converts positional advantages and defends pawn-down positions tenaciously.';

  const timeWeakness = profile.wins > profile.losses 
    ? 'Paces matches well under pressure. Few time scrambles recorded.'
    : 'Struggles with dynamic speed play. Shows anxiety and tactical oversights in Bullet/Turbo matches.';

  const tacticsScore = Math.max(35, Math.min(98, 65 + (profile.wins * 3) - (profile.losses * 2)));
  const defenseScore = Math.max(40, Math.min(95, 60 + (profile.draws * 5) + (profile.wins * 1.5) - (profile.losses * 1)));

  const suggestions: string[] = [];
  if (openingRatio > 0.4) {
    suggestions.push('Study standard opening principles: control center, develop knights/bishops early, and castle before initiating contact.');
  }
  if (endgameRatio > 0.4) {
    suggestions.push('Practice technical endgames in the Live Analysis Lab, especially Rook-and-Pawn and King-and-Pawn endgames.');
  }
  if (profile.losses > profile.wins) {
    suggestions.push('Slow down thinking speeds. Use Balanced or Deep search limits to observe strategic threats before they solidify.');
  }
  suggestions.push('Utilize the opening book in the Live Analysis Lab to memorize theoretical chess defenses.');
  suggestions.push('Integrate NeuralMate external insights to cross-reference opening structures.');

  return {
    openingsWeakness,
    endgameWeakness,
    timeWeakness,
    overallTactics: Math.round(tacticsScore),
    overallDefenses: Math.round(defenseScore),
    suggestions
  };
}
