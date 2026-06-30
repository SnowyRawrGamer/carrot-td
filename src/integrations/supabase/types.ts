export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          changes: Json
          id: string
          record_id: string
          record_label: string | null
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changes: Json
          id?: string
          record_id: string
          record_label?: string | null
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changes?: Json
          id?: string
          record_id?: string
          record_label?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
        ]
      }
      chest_entries: {
        Row: {
          chest_id: string
          drop_rate: number
          id: string
          unit_id: string
        }
        Insert: {
          chest_id: string
          drop_rate?: number
          id?: string
          unit_id: string
        }
        Update: {
          chest_id?: string
          drop_rate?: number
          id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chest_entries_chest_id_fkey"
            columns: ["chest_id"]
            isOneToOne: false
            referencedRelation: "chests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chest_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      chests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          removed_update_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          removed_update_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          removed_update_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chests_removed_update_id_fkey"
            columns: ["removed_update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      community_loadout_units: {
        Row: {
          id: string
          level: number
          loadout_id: string
          path_index: number | null
          placement_count: number
          slot_index: number
          unit_id: string
        }
        Insert: {
          id?: string
          level?: number
          loadout_id: string
          path_index?: number | null
          placement_count?: number
          slot_index: number
          unit_id: string
        }
        Update: {
          id?: string
          level?: number
          loadout_id?: string
          path_index?: number | null
          placement_count?: number
          slot_index?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_loadout_units_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "community_loadouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_loadout_units_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "public_loadouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_loadout_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      community_loadout_votes: {
        Row: {
          created_at: string
          id: string
          loadout_id: string
          user_id: string
          vote: number
        }
        Insert: {
          created_at?: string
          id?: string
          loadout_id: string
          user_id: string
          vote: number
        }
        Update: {
          created_at?: string
          id?: string
          loadout_id?: string
          user_id?: string
          vote?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_loadout_votes_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "community_loadouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_loadout_votes_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "public_loadouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_loadout_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_loadout_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
        ]
      }
      community_loadouts: {
        Row: {
          created_at: string
          creator_id: string
          custom_display_name: string | null
          description: string | null
          id: string
          show_real_name: boolean
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          custom_display_name?: string | null
          description?: string | null
          id?: string
          show_real_name?: boolean
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          custom_display_name?: string | null
          description?: string | null
          id?: string
          show_real_name?: boolean
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_loadouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_loadouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_loadout_ratings: {
        Row: {
          created_at: string | null
          difficulty_rating: number
          fun_rating: number
          id: string
          loadout_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          difficulty_rating: number
          fun_rating: number
          id?: string
          loadout_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          difficulty_rating?: number
          fun_rating?: number
          id?: string
          loadout_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_loadout_ratings_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "daily_loadouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_loadout_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_loadout_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_loadouts: {
        Row: {
          created_at: string | null
          date: string
          id: string
          unit_ids: string[]
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          unit_ids: string[]
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          unit_ids?: string[]
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          image_url: string | null
          parent_id: string | null
          post_id: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          parent_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          parent_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_flags: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          reason: string
          resolved: boolean
          resolved_by: string | null
          resolved_valid: boolean | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason: string
          resolved?: boolean
          resolved_by?: string | null
          resolved_valid?: boolean | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string
          resolved?: boolean
          resolved_by?: string | null
          resolved_valid?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_flags_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_flags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_help_log: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_help_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_help_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_likes: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "forum_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          image_url: string | null
          pinned: boolean
          status: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          pinned?: boolean
          status?: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          pinned?: boolean
          status?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      gamemodes: {
        Row: {
          created_at: string
          description: string | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          name: string
          removed_update_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          name: string
          removed_update_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          name?: string
          removed_update_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamemodes_removed_update_id_fkey"
            columns: ["removed_update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      maps: {
        Row: {
          created_at: string
          description: string | null
          gallery_urls: Json
          id: string
          image_url: string | null
          name: string
          removed_update_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gallery_urls?: Json
          id?: string
          image_url?: string | null
          name: string
          removed_update_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gallery_urls?: Json
          id?: string
          image_url?: string | null
          name?: string
          removed_update_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maps_removed_update_id_fkey"
            columns: ["removed_update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_moderation: {
        Row: {
          forum_ban_reason: string | null
          forum_banned_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          forum_ban_reason?: string | null
          forum_banned_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          forum_ban_reason?: string | null
          forum_banned_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_moderation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_moderation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          help_points: number
          id: string
          public_name: string | null
          trust_level: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          help_points?: number
          id: string
          public_name?: string | null
          trust_level?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          help_points?: number
          id?: string
          public_name?: string | null
          trust_level?: string
          username?: string | null
        }
        Relationships: []
      }
      site_feedback: {
        Row: {
          admin_response: string | null
          allow_response: boolean | null
          body: string
          category: string
          created_at: string
          id: string
          note_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          allow_response?: boolean | null
          body: string
          category: string
          created_at?: string
          id?: string
          note_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          allow_response?: boolean | null
          body?: string
          category?: string
          created_at?: string
          id?: string
          note_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_feedback_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "site_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      site_note_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          note_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          note_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_note_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_note_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_note_comments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "site_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      site_notes: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          id: string
          is_feedback: boolean | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_feedback?: boolean | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_feedback?: boolean | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_editors"
            referencedColumns: ["id"]
          },
        ]
      }
      summon_entries: {
        Row: {
          custom_image_url: string | null
          custom_name: string | null
          drop_rate: number
          id: string
          summon_id: string
          unit_id: string | null
        }
        Insert: {
          custom_image_url?: string | null
          custom_name?: string | null
          drop_rate?: number
          id?: string
          summon_id: string
          unit_id?: string | null
        }
        Update: {
          custom_image_url?: string | null
          custom_name?: string | null
          drop_rate?: number
          id?: string
          summon_id?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "summon_entries_summon_id_fkey"
            columns: ["summon_id"]
            isOneToOne: false
            referencedRelation: "summons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summon_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      summons: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          is_custom: boolean
          name: string
          removed_update_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_custom?: boolean
          name: string
          removed_update_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_custom?: boolean
          name?: string
          removed_update_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "summons_removed_update_id_fkey"
            columns: ["removed_update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_upgrade_levels: {
        Row: {
          cost: number | null
          id: string
          level: number
          path_id: string
          stats: Json
        }
        Insert: {
          cost?: number | null
          id?: string
          level: number
          path_id: string
          stats?: Json
        }
        Update: {
          cost?: number | null
          id?: string
          level?: number
          path_id?: string
          stats?: Json
        }
        Relationships: [
          {
            foreignKeyName: "unit_upgrade_levels_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "unit_upgrade_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_upgrade_paths: {
        Row: {
          id: string
          label: string | null
          path_index: number
          unit_id: string
        }
        Insert: {
          id?: string
          label?: string | null
          path_index: number
          unit_id: string
        }
        Update: {
          id?: string
          label?: string | null
          path_index?: number
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_upgrade_paths_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          base_stats: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          photo_url: string | null
          rarity: string | null
          removed_update_id: string | null
          slug: string
          tier: string | null
          updated_at: string
        }
        Insert: {
          base_stats?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          photo_url?: string | null
          rarity?: string | null
          removed_update_id?: string | null
          slug: string
          tier?: string | null
          updated_at?: string
        }
        Update: {
          base_stats?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          rarity?: string | null
          removed_update_id?: string | null
          slug?: string
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_removed_update_id_fkey"
            columns: ["removed_update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_chests: {
        Row: {
          chest_id: string
          update_id: string
        }
        Insert: {
          chest_id: string
          update_id: string
        }
        Update: {
          chest_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_chests_chest_id_fkey"
            columns: ["chest_id"]
            isOneToOne: false
            referencedRelation: "chests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_chests_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_gamemodes: {
        Row: {
          gamemode_id: string
          update_id: string
        }
        Insert: {
          gamemode_id: string
          update_id: string
        }
        Update: {
          gamemode_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_gamemodes_gamemode_id_fkey"
            columns: ["gamemode_id"]
            isOneToOne: false
            referencedRelation: "gamemodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_gamemodes_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_maps: {
        Row: {
          map_id: string
          update_id: string
        }
        Insert: {
          map_id: string
          update_id: string
        }
        Update: {
          map_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_maps_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_maps_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_summons: {
        Row: {
          summon_id: string
          update_id: string
        }
        Insert: {
          summon_id: string
          update_id: string
        }
        Update: {
          summon_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_summons_summon_id_fkey"
            columns: ["summon_id"]
            isOneToOne: false
            referencedRelation: "summons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_summons_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_units: {
        Row: {
          unit_id: string
          update_id: string
        }
        Insert: {
          unit_id: string
          update_id: string
        }
        Update: {
          unit_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_units_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          released_at: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          released_at?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          released_at?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      community_loadout_scores: {
        Row: {
          loadout_id: string | null
          score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_loadout_votes_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "community_loadouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_loadout_votes_loadout_id_fkey"
            columns: ["loadout_id"]
            isOneToOne: false
            referencedRelation: "public_loadouts"
            referencedColumns: ["id"]
          },
        ]
      }
      public_editors: {
        Row: {
          id: string | null
          public_name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      public_loadouts: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string | null
          id: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_profiles: {
        Args: never
        Returns: {
          display_name: string
          email: string
          id: string
          public_name: string
        }[]
      }
      increment_view_count: { Args: { post_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "editor", "viewer"],
    },
  },
} as const
