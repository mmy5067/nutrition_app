export type Profile = {
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  birthday?: string | null;
  sex?: string | null;
};

export type MealItem = {
  id?: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
};

export type Meal = {
  id: number;
  eaten_at: string;
  meal_type: string | null;
  note: string | null;
  items: MealItem[];
};

export type SummaryResponse = {
  ok: boolean;
  date: string;
  total_calories?: number;
  total_protein?: number;
  total_fat?: number;
  total_carbs?: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
};
