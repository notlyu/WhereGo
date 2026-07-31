// Типы схемы БД.
//
// ⚠️ Файл заготовлен вручную по `supabase/migrations/0001_init.sql`, чтобы
// проект собирался до создания проекта Supabase. Как только проект создан и
// миграция применена — перегенерировать и не править руками:
//
//     pnpm types:gen
//
// (то же самое: supabase gen types typescript --linked > src/types/database.ts)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PlaceStatusEnum = 'want' | 'visited' | 'rejected'
export type PriceLevelEnum = 'free' | 'low' | 'medium' | 'high'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          display_name?: string
          avatar_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          emoji: string | null
          sort_order: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          emoji?: string | null
          sort_order?: number
          created_by?: string | null
        }
        Update: {
          name?: string
          emoji?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      places: {
        Row: {
          id: string
          title: string
          category_id: string | null
          status: PlaceStatusEnum
          is_idea: boolean
          description: string | null
          address: string | null
          lat: number | null
          lng: number | null
          source_url: string | null
          source_title: string | null
          price: PriceLevelEnum | null
          opening_hours: Json | null
          author_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          category_id?: string | null
          status?: PlaceStatusEnum
          is_idea?: boolean
          description?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          source_url?: string | null
          source_title?: string | null
          price?: PriceLevelEnum | null
          opening_hours?: Json | null
          author_id: string
        }
        Update: {
          title?: string
          category_id?: string | null
          status?: PlaceStatusEnum
          is_idea?: boolean
          description?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          source_url?: string | null
          source_title?: string | null
          price?: PriceLevelEnum | null
          opening_hours?: Json | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          place_id: string
          author_id: string
          rating: number
          text: string | null
          visited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          place_id: string
          author_id: string
          rating: number
          text?: string | null
          visited_at?: string | null
        }
        Update: {
          rating?: number
          text?: string | null
          visited_at?: string | null
        }
        Relationships: []
      }
      photos: {
        Row: {
          id: string
          place_id: string | null
          review_id: string | null
          r2_key: string
          url: string
          width: number | null
          height: number | null
          sort_order: number
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          place_id?: string | null
          review_id?: string | null
          r2_key: string
          url: string
          width?: number | null
          height?: number | null
          sort_order?: number
          uploaded_by: string
        }
        Update: {
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      matches: {
        Row: Database['public']['Tables']['places']['Row']
        Relationships: []
      }
    }
    Functions: {
      set_place_status: {
        Args: { p_place_id: string; p_status: PlaceStatusEnum }
        Returns: undefined
      }
    }
    Enums: {
      place_status: PlaceStatusEnum
      price_level: PriceLevelEnum
    }
    CompositeTypes: Record<never, never>
  }
}
