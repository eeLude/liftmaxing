export type WorkoutSplit = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Movement = {
  id: string;
  name: string;
  target_muscle: string;
  created_at: string;
};

export type SplitExercise = {
  id: string;
  split_id: string;
  movement_id: string;
  default_sets: number;
  sort_order: number;
  created_at: string;
  movements: Movement;
};

export type WorkoutSession = {
  id: string;
  split_id: string;
  user_id: string;
  date: string;
  is_seeded: boolean;
  completed_at: string | null;
  created_at: string;
};

export type SessionExercise = {
  id: string;
  session_id: string;
  template_slot_id: string | null;
  movement_id: string;
  sort_order: number;
  note: string | null;
  created_at: string;
};

export type WorkoutLog = {
  id: string;
  session_exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  created_at: string;
};

export type HealthLog = {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  calories: number | null;
  created_at: string;
};

export type UserProfile = {
  user_id: string;
  goal_type: "bulk" | "cut" | "maintain" | null;
  updated_at: string;
};

export type BookStatus = "reading" | "finished";

export type Book = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  status: BookStatus;
  started_on: string | null;
  finished_on: string | null;
  page_count: number | null;
  rating: number | null;
  note: string | null;
  created_at: string;
};

export type MoodLog = {
  id: string;
  user_id: string;
  date: string;
  score: number;
  note: string | null;
  created_at: string;
};

export type SpotifyToken = {
  user_id: string;
  refresh_token: string;
  updated_at: string;
};

export type HoldingKind = "stock" | "fund" | "cash";
export type HoldingAccount = "OST" | "AOT";

export type PortfolioHolding = {
  id: string;
  user_id: string;
  name: string;
  ticker: string;
  kind: HoldingKind;
  account: HoldingAccount;
  qty: number;
  cost_eur: number;
  currency: string;
  created_at: string;
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type DbTable<
  T extends { id: string; created_at: string },
  R extends Relationship[] = [],
> = {
  Row: T;
  Insert: Omit<T, "id" | "created_at"> & {
    id?: string;
    created_at?: string;
  };
  Update: Partial<T>;
  Relationships: R;
};

export type Database = {
  public: {
    Tables: {
      workout_splits: DbTable<WorkoutSplit>;
      movements: DbTable<Movement>;
      split_exercises: DbTable<
        Omit<SplitExercise, "movements">,
        [
          {
            foreignKeyName: "split_exercises_split_id_fkey";
            columns: ["split_id"];
            referencedRelation: "workout_splits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "split_exercises_movement_id_fkey";
            columns: ["movement_id"];
            referencedRelation: "movements";
            referencedColumns: ["id"];
          },
        ]
      >;
      workout_sessions: DbTable<
        WorkoutSession,
        [
          {
            foreignKeyName: "workout_sessions_split_id_fkey";
            columns: ["split_id"];
            referencedRelation: "workout_splits";
            referencedColumns: ["id"];
          },
        ]
      >;
      session_exercises: DbTable<
        SessionExercise,
        [
          {
            foreignKeyName: "session_exercises_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_exercises_template_slot_id_fkey";
            columns: ["template_slot_id"];
            referencedRelation: "split_exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_exercises_movement_id_fkey";
            columns: ["movement_id"];
            referencedRelation: "movements";
            referencedColumns: ["id"];
          },
        ]
      >;
      workout_logs: DbTable<
        WorkoutLog,
        [
          {
            foreignKeyName: "workout_logs_session_exercise_id_fkey";
            columns: ["session_exercise_id"];
            referencedRelation: "session_exercises";
            referencedColumns: ["id"];
          },
        ]
      >;
      health_logs: DbTable<HealthLog>;
      books: DbTable<Book>;
      mood_logs: DbTable<MoodLog>;
      spotify_tokens: {
        Row: SpotifyToken;
        Insert: {
          user_id?: string;
          refresh_token: string;
          updated_at?: string;
        };
        Update: Partial<SpotifyToken>;
        Relationships: [];
      };
      portfolio_holdings: DbTable<PortfolioHolding>;
      user_profiles: {
        Row: UserProfile;
        Insert: {
          user_id?: string;
          goal_type?: UserProfile["goal_type"];
          updated_at?: string;
        };
        Update: Partial<UserProfile>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type SetInput = {
  weight_kg: string;
  reps: string;
};

export type WorkoutCardDraft = {
  cardId: string;
  slotId: string | null;
  sessionExerciseId?: string | null;
  performedMovementId: string;
  performedName: string;
  targetMuscle: string;
  sets: SetInput[];
  note: string;
};

export type PreviousExerciseData = {
  sets: { weight_kg: number; reps: number; set_number: number }[];
  note: string | null;
  sessionDate: string;
};
