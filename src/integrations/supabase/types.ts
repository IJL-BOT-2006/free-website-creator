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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          archived: boolean
          audience: string
          content: string
          cover_url: string | null
          created_at: string
          created_by: string | null
          id: string
          pinned: boolean
          publish_date: string | null
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          audience?: string
          content: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          publish_date?: string | null
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          audience?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          publish_date?: string | null
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_supervisors: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          supervisor_id: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          supervisor_id: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_supervisors_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_supervisors_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_teachers: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_teachers_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          archived: boolean
          circle_type: string
          created_at: string
          days: string[]
          id: string
          level: string | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["circle_status"]
          time_text: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          circle_type?: string
          created_at?: string
          days?: string[]
          id?: string
          level?: string | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["circle_status"]
          time_text?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          circle_type?: string
          created_at?: string
          days?: string[]
          id?: string
          level?: string | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["circle_status"]
          time_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      login_directory: {
        Row: {
          active: boolean
          full_name: string
          user_id: string
          username: string
        }
        Insert: {
          active?: boolean
          full_name: string
          user_id: string
          username: string
        }
        Update: {
          active?: boolean
          full_name?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      memorization_reports: {
        Row: {
          amount: string | null
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          circle_id: string
          created_at: string
          curriculum: string | null
          evaluation: string | null
          id: string
          notes: string | null
          report_date: string
          revision: string | null
          student_id: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: string | null
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          circle_id: string
          created_at?: string
          curriculum?: string | null
          evaluation?: string | null
          id?: string
          notes?: string | null
          report_date?: string
          revision?: string | null
          student_id: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: string | null
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          circle_id?: string
          created_at?: string
          curriculum?: string | null
          evaluation?: string | null
          id?: string
          notes?: string | null
          report_date?: string
          revision?: string | null
          student_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorization_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorization_reports_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorization_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorization_reports_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          education_level: string | null
          full_name: string
          id: string
          notes: string | null
          occupation: string | null
          origin_country: string | null
          phone: string | null
          phone_code: string | null
          residence_country: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          username: string
          username_display: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          education_level?: string | null
          full_name: string
          id: string
          notes?: string | null
          occupation?: string | null
          origin_country?: string | null
          phone?: string | null
          phone_code?: string | null
          residence_country?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username: string
          username_display?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          education_level?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          occupation?: string | null
          origin_country?: string | null
          phone?: string | null
          phone_code?: string | null
          residence_country?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username?: string
          username_display?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          assignee_id: string | null
          attachment_url: string | null
          circle_id: string | null
          created_at: string
          created_by: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          priority: string
          reason: string
          request_no: number
          request_type: string
          status: Database["public"]["Enums"]["request_status"]
          student_id: string | null
          target_circle_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          attachment_url?: string | null
          circle_id?: string | null
          created_at?: string
          created_by: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          reason: string
          request_no?: never
          request_type: string
          status?: Database["public"]["Enums"]["request_status"]
          student_id?: string | null
          target_circle_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          attachment_url?: string | null
          circle_id?: string | null
          created_at?: string
          created_by?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          reason?: string
          request_no?: never
          request_type?: string
          status?: Database["public"]["Enums"]["request_status"]
          student_id?: string | null
          target_circle_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_target_circle_id_fkey"
            columns: ["target_circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          archived: boolean
          audience: string
          category: string
          created_at: string
          created_by: string | null
          file_url: string | null
          folder: string | null
          id: string
          name: string
          notes: string | null
          url: string | null
        }
        Insert: {
          archived?: boolean
          audience?: string
          category?: string
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          folder?: string | null
          id?: string
          name: string
          notes?: string | null
          url?: string | null
        }
        Update: {
          archived?: boolean
          audience?: string
          category?: string
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          folder?: string | null
          id?: string
          name?: string
          notes?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          notes: string | null
          recorded_by: string | null
          session_date: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          session_date?: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_value: string | null
          id: string
          notes: string | null
          reason: string | null
          student_id: string
          to_value: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_value?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          student_id: string
          to_value?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_value?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          student_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string | null
          circle_id: string | null
          country: string | null
          created_at: string
          education_level: string | null
          enrolled_at: string
          full_name: string
          id: string
          level: string | null
          notes: string | null
          occupation: string | null
          origin_country: string | null
          phone: string | null
          phone_code: string | null
          pledges_count: number
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
          warnings_count: number
        }
        Insert: {
          birth_date?: string | null
          circle_id?: string | null
          country?: string | null
          created_at?: string
          education_level?: string | null
          enrolled_at?: string
          full_name: string
          id?: string
          level?: string | null
          notes?: string | null
          occupation?: string | null
          origin_country?: string | null
          phone?: string | null
          phone_code?: string | null
          pledges_count?: number
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
          warnings_count?: number
        }
        Update: {
          birth_date?: string | null
          circle_id?: string | null
          country?: string | null
          created_at?: string
          education_level?: string | null
          enrolled_at?: string
          full_name?: string
          id?: string
          level?: string | null
          notes?: string | null
          occupation?: string | null
          origin_country?: string | null
          phone?: string | null
          phone_code?: string | null
          pledges_count?: number
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
          warnings_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "students_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          module: string
          result: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          module: string
          result?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          module?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string
          attachment_url: string | null
          coordinator_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          status: Database["public"]["Enums"]["task_status"]
          subtasks: Json
          task_no: number
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id: string
          attachment_url?: string | null
          coordinator_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          status?: Database["public"]["Enums"]["task_status"]
          subtasks?: Json
          task_no?: never
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string
          attachment_url?: string | null
          coordinator_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          status?: Database["public"]["Enums"]["task_status"]
          subtasks?: Json
          task_no?: never
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          makeup_date: string | null
          makeup_done: boolean
          reason: string | null
          recorded_by: string | null
          session_date: string
          status: Database["public"]["Enums"]["attendance_status"]
          teacher_id: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          makeup_date?: string | null
          makeup_done?: boolean
          reason?: string | null
          recorded_by?: string | null
          session_date?: string
          status: Database["public"]["Enums"]["attendance_status"]
          teacher_id: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          makeup_date?: string | null
          makeup_done?: boolean
          reason?: string | null
          recorded_by?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      can_view_circle: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      supervises_circle: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
      teaches_circle: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "archived"
      app_role: "manager" | "deputy" | "supervisor" | "teacher"
      attendance_status: "present" | "excused" | "unexcused"
      circle_status: "active" | "paused" | "closed"
      request_status: "pending" | "approved" | "rejected" | "archived"
      student_status: "active" | "paused" | "warned" | "expelled"
      task_status: "in_progress" | "done" | "not_done"
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
      account_status: ["active", "suspended", "archived"],
      app_role: ["manager", "deputy", "supervisor", "teacher"],
      attendance_status: ["present", "excused", "unexcused"],
      circle_status: ["active", "paused", "closed"],
      request_status: ["pending", "approved", "rejected", "archived"],
      student_status: ["active", "paused", "warned", "expelled"],
      task_status: ["in_progress", "done", "not_done"],
    },
  },
} as const
