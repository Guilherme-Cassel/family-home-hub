/**
 * Tipos do banco, escritos à mão para espelhar `supabase/migrations`.
 *
 * Quando o projeto Supabase existir, dá para regenerar automaticamente com:
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 * O formato aqui é o mesmo que o gerador produz, então a troca é direta.
 *
 * Colunas geradas (`is_below_minimum`, `next_due_date`) aparecem em `Row` mas
 * ficam de fora de `Insert`/`Update`, porque o Postgres não aceita escrevê-las.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Timestamps = {
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          created_at?: string
        }
        Relationships: []
      }

      stock_items: {
        Row: Timestamps & {
          id: string
          name: string
          category: string
          unit: string
          current_quantity: number
          minimum_quantity: number
          expiration_date: string | null
          last_price: number | null
          notes: string | null
          is_below_minimum: boolean
        }
        Insert: {
          id?: string
          name: string
          category?: string
          unit?: string
          current_quantity?: number
          minimum_quantity?: number
          expiration_date?: string | null
          last_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string
          unit?: string
          current_quantity?: number
          minimum_quantity?: number
          expiration_date?: string | null
          last_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }

      stock_movements: {
        Row: {
          id: string
          stock_item_id: string
          quantity_change: number
          price_at_time: number | null
          reason: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          stock_item_id: string
          quantity_change: number
          price_at_time?: number | null
          reason?: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          stock_item_id?: string
          quantity_change?: number
          price_at_time?: number | null
          reason?: string
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }

      shopping_list_extras: {
        Row: {
          id: string
          name: string
          quantity: number | null
          unit: string | null
          is_done: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          quantity?: number | null
          unit?: string | null
          is_done?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          quantity?: number | null
          unit?: string | null
          is_done?: boolean
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }

      maintenance_items: {
        Row: Timestamps & {
          id: string
          name: string
          category: string | null
          frequency_days: number
          last_done_date: string
          next_due_date: string
          notes: string | null
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          frequency_days: number
          last_done_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          frequency_days?: number
          last_done_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }

      maintenance_log: {
        Row: {
          id: string
          maintenance_item_id: string
          done_date: string
          done_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          maintenance_item_id: string
          done_date?: string
          done_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          maintenance_item_id?: string
          done_date?: string
          done_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }

      app_settings: {
        Row: {
          id: boolean
          expiry_warning_days: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          expiry_warning_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          expiry_warning_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }

    Views: Record<never, never>

    Functions: {
      mark_maintenance_done: {
        Args: {
          p_item_id: string
          p_done_date?: string
          p_notes?: string | null
        }
        Returns: Database['public']['Tables']['maintenance_items']['Row']
      }
      apply_stock_entries: {
        Args: { p_entries: Json }
        Returns: number
      }
    }

    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

/** Atalho para o tipo `Row` de uma tabela. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Atalho para o tipo `Insert` de uma tabela. */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/** Atalho para o tipo `Update` de uma tabela. */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
