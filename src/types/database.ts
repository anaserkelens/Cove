export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_events: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          household_id: string;
          id: string;
          metadata: Json;
          summary: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          household_id: string;
          id?: string;
          metadata?: Json;
          summary: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          household_id?: string;
          id?: string;
          metadata?: Json;
          summary?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_item_events: {
        Row: {
          actor_id: string | null;
          admin_item_id: string;
          created_at: string;
          event_type: string;
          household_id: string;
          id: string;
          metadata: Json;
          occurred_at: string;
          updated_at: string;
        };
        Insert: {
          actor_id?: string | null;
          admin_item_id: string;
          created_at?: string;
          event_type: string;
          household_id: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          updated_at?: string;
        };
        Update: {
          actor_id?: string | null;
          admin_item_id?: string;
          created_at?: string;
          event_type?: string;
          household_id?: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_item_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_item_events_admin_item_id_fkey";
            columns: ["admin_item_id"];
            isOneToOne: false;
            referencedRelation: "admin_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_item_events_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_items: {
        Row: {
          action_date: string | null;
          amount_minor: number | null;
          archived_at: string | null;
          auto_pay: boolean;
          category_id: string | null;
          created_at: string;
          created_by: string;
          currency_code: string | null;
          description: string | null;
          due_date: string | null;
          expiry_date: string | null;
          household_id: string;
          id: string;
          next_occurrence_date: string | null;
          notes: string | null;
          owner_id: string | null;
          paid_at: string | null;
          provider_name: string | null;
          recurrence_rule: string | null;
          recurrence_source_id: string | null;
          recurrence_timezone: string | null;
          reference_number: string | null;
          status: Database["public"]["Enums"]["admin_item_status"];
          title: string;
          type: Database["public"]["Enums"]["admin_item_type"];
          updated_at: string;
        };
        Insert: {
          action_date?: string | null;
          amount_minor?: number | null;
          archived_at?: string | null;
          auto_pay?: boolean;
          category_id?: string | null;
          created_at?: string;
          created_by: string;
          currency_code?: string | null;
          description?: string | null;
          due_date?: string | null;
          expiry_date?: string | null;
          household_id: string;
          id?: string;
          next_occurrence_date?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          paid_at?: string | null;
          provider_name?: string | null;
          recurrence_rule?: string | null;
          recurrence_source_id?: string | null;
          recurrence_timezone?: string | null;
          reference_number?: string | null;
          status?: Database["public"]["Enums"]["admin_item_status"];
          title: string;
          type: Database["public"]["Enums"]["admin_item_type"];
          updated_at?: string;
        };
        Update: {
          action_date?: string | null;
          amount_minor?: number | null;
          archived_at?: string | null;
          auto_pay?: boolean;
          category_id?: string | null;
          created_at?: string;
          created_by?: string;
          currency_code?: string | null;
          description?: string | null;
          due_date?: string | null;
          expiry_date?: string | null;
          household_id?: string;
          id?: string;
          next_occurrence_date?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          paid_at?: string | null;
          provider_name?: string | null;
          recurrence_rule?: string | null;
          recurrence_source_id?: string | null;
          recurrence_timezone?: string | null;
          reference_number?: string | null;
          status?: Database["public"]["Enums"]["admin_item_status"];
          title?: string;
          type?: Database["public"]["Enums"]["admin_item_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_items_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_items_recurrence_source_id_fkey";
            columns: ["recurrence_source_id"];
            isOneToOne: false;
            referencedRelation: "admin_items";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          entity_id: string;
          entity_type: Database["public"]["Enums"]["household_entity_type"];
          household_id: string;
          id: string;
          mime_type: string;
          original_filename: string;
          size_bytes: number;
          storage_bucket: string;
          storage_path: string;
          updated_at: string;
          uploaded_by: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          entity_id: string;
          entity_type: Database["public"]["Enums"]["household_entity_type"];
          household_id: string;
          id?: string;
          mime_type: string;
          original_filename: string;
          size_bytes: number;
          storage_bucket?: string;
          storage_path: string;
          updated_at?: string;
          uploaded_by: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          entity_id?: string;
          entity_type?: Database["public"]["Enums"]["household_entity_type"];
          household_id?: string;
          id?: string;
          mime_type?: string;
          original_filename?: string;
          size_bytes?: number;
          storage_bucket?: string;
          storage_path?: string;
          updated_at?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_events: {
        Row: {
          all_day: boolean;
          archived_at: string | null;
          assigned_to: string | null;
          category_id: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          end_date: string | null;
          ends_at: string | null;
          household_id: string;
          id: string;
          location: string | null;
          recurrence_rule: string | null;
          recurrence_timezone: string | null;
          start_date: string | null;
          starts_at: string | null;
          timezone: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          all_day?: boolean;
          archived_at?: string | null;
          assigned_to?: string | null;
          category_id?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          end_date?: string | null;
          ends_at?: string | null;
          household_id: string;
          id?: string;
          location?: string | null;
          recurrence_rule?: string | null;
          recurrence_timezone?: string | null;
          start_date?: string | null;
          starts_at?: string | null;
          timezone: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          all_day?: boolean;
          archived_at?: string | null;
          assigned_to?: string | null;
          category_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          end_date?: string | null;
          ends_at?: string | null;
          household_id?: string;
          id?: string;
          location?: string | null;
          recurrence_rule?: string | null;
          recurrence_timezone?: string | null;
          start_date?: string | null;
          starts_at?: string | null;
          timezone?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_memberships: {
        Row: {
          created_at: string;
          household_id: string;
          id: string;
          joined_at: string | null;
          role: Database["public"]["Enums"]["household_role"];
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          household_id: string;
          id?: string;
          joined_at?: string | null;
          role: Database["public"]["Enums"]["household_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          household_id?: string;
          id?: string;
          joined_at?: string | null;
          role?: Database["public"]["Enums"]["household_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_memberships_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      household_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          household_id: string;
          id: string;
          invited_by: string;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["household_role"];
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          household_id: string;
          id?: string;
          invited_by: string;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["household_role"];
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          household_id?: string;
          id?: string;
          invited_by?: string;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["household_role"];
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_invitations_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string;
          currency_code: string;
          id: string;
          name: string;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by: string;
          currency_code?: string;
          id?: string;
          name: string;
          slug: string;
          timezone: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string;
          currency_code?: string;
          id?: string;
          name?: string;
          slug?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          locale: string;
          timezone: string;
          updated_at: string;
          week_starts_on: number;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
          week_starts_on?: number;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          locale?: string;
          timezone?: string;
          updated_at?: string;
          week_starts_on?: number;
        };
        Relationships: [];
      };
      shopping_lists: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string;
          household_id: string;
          id: string;
          is_default: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by: string;
          household_id: string;
          id?: string;
          is_default?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string;
          household_id?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_lists_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_lists_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      task_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          deleted_at: string | null;
          household_id: string;
          id: string;
          task_id: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          household_id: string;
          id?: string;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          household_id?: string;
          id?: string;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_comments_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          archived_at: string | null;
          assigned_to: string | null;
          category_id: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          due_at: string | null;
          due_date: string | null;
          household_id: string;
          id: string;
          next_occurrence_date: string | null;
          priority: Database["public"]["Enums"]["task_priority"];
          recurrence_rule: string | null;
          recurrence_source_id: string | null;
          recurrence_timezone: string | null;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          assigned_to?: string | null;
          category_id?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          due_at?: string | null;
          due_date?: string | null;
          household_id: string;
          id?: string;
          next_occurrence_date?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          recurrence_rule?: string | null;
          recurrence_source_id?: string | null;
          recurrence_timezone?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          assigned_to?: string | null;
          category_id?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          due_at?: string | null;
          due_date?: string | null;
          household_id?: string;
          id?: string;
          next_occurrence_date?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          recurrence_rule?: string | null;
          recurrence_source_id?: string | null;
          recurrence_timezone?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_recurrence_source_id_fkey";
            columns: ["recurrence_source_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          channel: Database["public"]["Enums"]["reminder_channel"];
          created_at: string;
          created_by: string;
          dedupe_key: string;
          entity_id: string;
          entity_type: Database["public"]["Enums"]["household_entity_type"];
          household_id: string;
          id: string;
          recipient_user_id: string | null;
          remind_at: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["reminder_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          channel?: Database["public"]["Enums"]["reminder_channel"];
          created_at?: string;
          created_by: string;
          dedupe_key: string;
          entity_id: string;
          entity_type: Database["public"]["Enums"]["household_entity_type"];
          household_id: string;
          id?: string;
          recipient_user_id?: string | null;
          remind_at: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["reminder_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          channel?: Database["public"]["Enums"]["reminder_channel"];
          created_at?: string;
          created_by?: string;
          dedupe_key?: string;
          entity_id?: string;
          entity_type?: Database["public"]["Enums"]["household_entity_type"];
          household_id?: string;
          id?: string;
          recipient_user_id?: string | null;
          remind_at?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["reminder_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_recipient_user_id_fkey";
            columns: ["recipient_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_items: {
        Row: {
          added_by: string;
          assigned_to: string | null;
          category_id: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          household_id: string;
          id: string;
          name: string;
          note: string | null;
          quantity: number | null;
          recurring_hint: boolean;
          shopping_list_id: string;
          status: Database["public"]["Enums"]["shopping_item_status"];
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          added_by: string;
          assigned_to?: string | null;
          category_id?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          name: string;
          note?: string | null;
          quantity?: number | null;
          recurring_hint?: boolean;
          shopping_list_id: string;
          status?: Database["public"]["Enums"]["shopping_item_status"];
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          added_by?: string;
          assigned_to?: string | null;
          category_id?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          name?: string;
          note?: string | null;
          quantity?: number | null;
          recurring_hint?: boolean;
          shopping_list_id?: string;
          status?: Database["public"]["Enums"]["shopping_item_status"];
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_items_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_list_household_fk";
            columns: ["shopping_list_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "shopping_lists";
            referencedColumns: ["id", "household_id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_household_invitation: {
        Args: {
          invitation_token_hash: string;
        };
        Returns: Database["public"]["Tables"]["households"]["Row"];
      };
      archive_task: {
        Args: {
          target_task_id: string;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
      archive_calendar_event: {
        Args: {
          target_event_id: string;
        };
        Returns: Database["public"]["Tables"]["calendar_events"]["Row"];
      };
      archive_admin_item: {
        Args: {
          target_item_id: string;
        };
        Returns: Database["public"]["Tables"]["admin_items"]["Row"];
      };
      archive_shopping_list: {
        Args: {
          target_list_id: string;
        };
        Returns: Database["public"]["Tables"]["shopping_lists"]["Row"];
      };
      attachment_max_file_size_bytes: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      attachment_path_household_id: {
        Args: {
          storage_path: string | null;
        };
        Returns: string | null;
      };
      attachment_path_entity_id: {
        Args: {
          storage_path: string | null;
        };
        Returns: string | null;
      };
      attachment_path_entity_type: {
        Args: {
          storage_path: string | null;
        };
        Returns: Database["public"]["Enums"]["household_entity_type"] | null;
      };
      attachment_storage_bucket: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      build_reminder_dedupe_key: {
        Args: {
          target_channel: Database["public"]["Enums"]["reminder_channel"];
          target_entity_id: string;
          target_entity_type: Database["public"]["Enums"]["household_entity_type"];
          target_household_id: string;
          target_recipient_user_id: string | null;
          target_remind_at: string;
        };
        Returns: string;
      };
      calculate_next_task_due_date: {
        Args: {
          current_due_date: string;
          rule: string | null;
        };
        Returns: string | null;
      };
      cancel_pending_reminders_for_source: {
        Args: {
          target_entity_id: string;
          target_entity_type: Database["public"]["Enums"]["household_entity_type"];
          target_household_id: string;
        };
        Returns: number;
      };
      cancel_reminder: {
        Args: {
          target_reminder_id: string;
        };
        Returns: Database["public"]["Tables"]["reminders"]["Row"];
      };
      calculate_next_admin_occurrence_date: {
        Args: {
          item_action_date: string | null;
          item_due_date: string | null;
          item_expiry_date: string | null;
          rule: string | null;
        };
        Returns: string | null;
      };
      clamped_date: {
        Args: {
          target_day: number;
          target_month: number;
          target_year: number;
        };
        Returns: string;
      };
      complete_task: {
        Args: {
          target_task_id: string;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
      create_calendar_event: {
        Args: {
          event_all_day?: boolean;
          event_assigned_to?: string | null;
          event_description?: string | null;
          event_end_date?: string | null;
          event_ends_at?: string | null;
          event_location?: string | null;
          event_recurrence_rule?: string | null;
          event_recurrence_timezone?: string | null;
          event_start_date?: string | null;
          event_starts_at?: string | null;
          event_timezone?: string | null;
          event_title: string;
          target_household_id: string;
        };
        Returns: Database["public"]["Tables"]["calendar_events"]["Row"];
      };
      create_admin_item: {
        Args: {
          item_action_date?: string | null;
          item_amount_minor?: number | null;
          item_auto_pay?: boolean;
          item_currency_code?: string | null;
          item_description?: string | null;
          item_due_date?: string | null;
          item_expiry_date?: string | null;
          item_notes?: string | null;
          item_owner_id?: string | null;
          item_provider_name?: string | null;
          item_recurrence_rule?: string | null;
          item_recurrence_timezone?: string | null;
          item_reference_number?: string | null;
          item_title: string;
          item_type: Database["public"]["Enums"]["admin_item_type"];
          target_household_id: string;
        };
        Returns: Database["public"]["Tables"]["admin_items"]["Row"];
      };
      create_household: {
        Args: {
          household_currency_code?: string;
          household_name: string;
          household_timezone: string;
        };
        Returns: Database["public"]["Tables"]["households"]["Row"];
      };
      create_household_invitation: {
        Args: {
          invitation_email: string;
          invitation_expires_at: string;
          invitation_token_hash: string;
          target_household_id: string;
        };
        Returns: Database["public"]["Tables"]["household_invitations"]["Row"];
      };
      create_reminder: {
        Args: {
          reminder_entity_id: string;
          reminder_entity_type: Database["public"]["Enums"]["household_entity_type"];
          reminder_recipient_user_id?: string | null;
          reminder_remind_at: string;
          reminder_title: string;
          target_household_id: string;
        };
        Returns: Database["public"]["Tables"]["reminders"]["Row"];
      };
      create_shopping_item: {
        Args: {
          item_assigned_to?: string | null;
          item_name: string;
          item_note?: string | null;
          item_quantity?: number | null;
          item_recurring_hint?: boolean;
          item_unit?: string | null;
          target_list_id: string;
        };
        Returns: Database["public"]["Tables"]["shopping_items"]["Row"];
      };
      create_shopping_list: {
        Args: {
          list_name: string;
          target_household_id: string;
        };
        Returns: Database["public"]["Tables"]["shopping_lists"]["Row"];
      };
      create_task: {
        Args: {
          target_household_id: string;
          task_assigned_to?: string | null;
          task_description?: string | null;
          task_due_date?: string | null;
          task_priority?: Database["public"]["Enums"]["task_priority"];
          task_recurrence_rule?: string | null;
          task_recurrence_timezone?: string | null;
          task_title: string;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
      create_task_comment: {
        Args: {
          comment_body: string;
          target_task_id: string;
        };
        Returns: Database["public"]["Tables"]["task_comments"]["Row"];
      };
      ensure_profile: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      delete_attachment: {
        Args: {
          target_attachment_id: string;
        };
        Returns: Database["public"]["Tables"]["attachments"]["Row"];
      };
      household_attachment_quota_bytes: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      household_source_exists: {
        Args: {
          target_entity_id: string;
          target_entity_type: Database["public"]["Enums"]["household_entity_type"];
          target_household_id: string;
        };
        Returns: boolean;
      };
      is_active_household_member: {
        Args: {
          target_household_id: string;
          target_user_id: string;
        };
        Returns: boolean;
      };
      is_allowed_attachment_mime_type: {
        Args: {
          target_mime_type: string | null;
        };
        Returns: boolean;
      };
      is_household_member: {
        Args: {
          target_household_id: string;
        };
        Returns: boolean;
      };
      is_household_owner: {
        Args: {
          target_household_id: string;
        };
        Returns: boolean;
      };
      is_valid_time_zone: {
        Args: {
          target_timezone: string;
        };
        Returns: boolean;
      };
      mark_reminder_sent: {
        Args: {
          target_reminder_id: string;
        };
        Returns: Database["public"]["Tables"]["reminders"]["Row"];
      };
      reconcile_admin_item_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      reconcile_calendar_event_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      reconcile_household_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      reconcile_shopping_item_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      reconcile_task_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      revoke_household_invitation: {
        Args: {
          target_invitation_id: string;
        };
        Returns: Database["public"]["Tables"]["household_invitations"]["Row"];
      };
      readd_shopping_item: {
        Args: {
          target_item_id: string;
        };
        Returns: Database["public"]["Tables"]["shopping_items"]["Row"];
      };
      record_activity_event: {
        Args: {
          target_action: string;
          target_actor_id: string | null;
          target_entity_id: string | null;
          target_entity_type: string;
          target_household_id: string;
          target_metadata?: Json;
          target_summary: string;
        };
        Returns: Database["public"]["Tables"]["activity_events"]["Row"];
      };
      record_admin_item_event: {
        Args: {
          target_actor_id: string | null;
          target_admin_item_id: string;
          target_event_type: string;
          target_household_id: string;
          target_metadata?: Json;
        };
        Returns: Database["public"]["Tables"]["admin_item_events"]["Row"];
      };
      register_attachment: {
        Args: {
          attachment_entity_id: string;
          attachment_entity_type: Database["public"]["Enums"]["household_entity_type"];
          attachment_mime_type: string;
          attachment_original_filename: string;
          attachment_size_bytes: number;
          attachment_storage_bucket: string;
          attachment_storage_path: string;
          target_household_id: string;
        };
        Returns: Database["public"]["Tables"]["attachments"]["Row"];
      };
      shares_active_household_with: {
        Args: {
          target_user_id: string;
        };
        Returns: boolean;
      };
      set_default_shopping_list: {
        Args: {
          target_list_id: string;
        };
        Returns: Database["public"]["Tables"]["shopping_lists"]["Row"];
      };
      set_shopping_item_status: {
        Args: {
          item_status: Database["public"]["Enums"]["shopping_item_status"];
          target_item_id: string;
        };
        Returns: Database["public"]["Tables"]["shopping_items"]["Row"];
      };
      set_admin_item_status: {
        Args: {
          item_status: Database["public"]["Enums"]["admin_item_status"];
          target_item_id: string;
        };
        Returns: Database["public"]["Tables"]["admin_items"]["Row"];
      };
      slugify_household_name: {
        Args: {
          raw_name: string;
        };
        Returns: string;
      };
      update_task: {
        Args: {
          target_task_id: string;
          task_assigned_to?: string | null;
          task_description?: string | null;
          task_due_date?: string | null;
          task_priority?: Database["public"]["Enums"]["task_priority"];
          task_recurrence_rule?: string | null;
          task_recurrence_timezone?: string | null;
          task_status?: Database["public"]["Enums"]["task_status"];
          task_title: string;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
      update_calendar_event: {
        Args: {
          event_all_day?: boolean;
          event_assigned_to?: string | null;
          event_description?: string | null;
          event_end_date?: string | null;
          event_ends_at?: string | null;
          event_location?: string | null;
          event_recurrence_rule?: string | null;
          event_recurrence_timezone?: string | null;
          event_start_date?: string | null;
          event_starts_at?: string | null;
          event_timezone?: string | null;
          event_title: string;
          target_event_id: string;
        };
        Returns: Database["public"]["Tables"]["calendar_events"]["Row"];
      };
      update_admin_item: {
        Args: {
          item_action_date?: string | null;
          item_amount_minor?: number | null;
          item_auto_pay?: boolean;
          item_currency_code?: string | null;
          item_description?: string | null;
          item_due_date?: string | null;
          item_expiry_date?: string | null;
          item_notes?: string | null;
          item_owner_id?: string | null;
          item_provider_name?: string | null;
          item_recurrence_rule?: string | null;
          item_recurrence_timezone?: string | null;
          item_reference_number?: string | null;
          item_title: string;
          item_type: Database["public"]["Enums"]["admin_item_type"];
          target_item_id: string;
        };
        Returns: Database["public"]["Tables"]["admin_items"]["Row"];
      };
      update_shopping_item: {
        Args: {
          item_assigned_to?: string | null;
          item_name: string;
          item_note?: string | null;
          item_quantity?: number | null;
          item_recurring_hint?: boolean;
          item_unit?: string | null;
          target_item_id: string;
        };
        Returns: Database["public"]["Tables"]["shopping_items"]["Row"];
      };
      update_shopping_list: {
        Args: {
          list_name: string;
          target_list_id: string;
        };
        Returns: Database["public"]["Tables"]["shopping_lists"]["Row"];
      };
    };
    Enums: {
      admin_item_status:
        | "upcoming"
        | "needs_review"
        | "waiting"
        | "paid"
        | "renewed"
        | "completed"
        | "cancelled"
        | "overdue";
      admin_item_type:
        | "bill"
        | "subscription"
        | "renewal"
        | "expiration"
        | "return_window"
        | "maintenance"
        | "contract"
        | "appointment"
        | "other";
      household_entity_type:
        | "household"
        | "task"
        | "shopping_item"
        | "calendar_event"
        | "admin_item";
      household_role: "owner" | "member";
      membership_status: "active" | "invited" | "revoked";
      reminder_channel: "in_app";
      reminder_status: "pending" | "sent" | "cancelled" | "failed";
      shopping_item_status: "needed" | "in_cart" | "purchased" | "removed";
      task_priority: "low" | "normal" | "high";
      task_status: "open" | "in_progress" | "completed" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};
