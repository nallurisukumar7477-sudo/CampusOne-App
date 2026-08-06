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
      attendance_records: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string | null
          section_id: string | null
          status: string
          student_id: string
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          section_id?: string | null
          status: string
          student_id: string
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          section_id?: string | null
          status?: string
          student_id?: string
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          department_id: string
          duration_years: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id: string
          duration_years?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string
          duration_years?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      faculty_assignments: {
        Row: {
          created_at: string
          faculty_id: string
          id: string
          section_id: string
          subject_id: string | null
        }
        Insert: {
          created_at?: string
          faculty_id: string
          id?: string
          section_id: string
          subject_id?: string | null
        }
        Update: {
          created_at?: string
          faculty_id?: string
          id?: string
          section_id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_reads: {
        Row: {
          created_at: string
          id: string
          notice_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notice_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notice_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_reads_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          category: Database["public"]["Enums"]["notice_category"]
          course_id: string | null
          created_at: string
          created_by: string
          created_by_name: string
          department_id: string | null
          description: string
          id: string
          priority: Database["public"]["Enums"]["notice_priority"]
          published: boolean
          published_at: string
          section_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["notice_category"]
          course_id?: string | null
          created_at?: string
          created_by: string
          created_by_name?: string
          department_id?: string | null
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["notice_priority"]
          published?: boolean
          published_at?: string
          section_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["notice_category"]
          course_id?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          department_id?: string | null
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["notice_priority"]
          published?: boolean
          published_at?: string
          section_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          course_id: string | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          identifier: string | null
          phone: string | null
          profile_completed: boolean
          roll_number: string | null
          section_id: string | null
          semester: number | null
          specialization: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          full_name?: string
          id: string
          identifier?: string | null
          phone?: string | null
          profile_completed?: boolean
          roll_number?: string | null
          section_id?: string | null
          semester?: number | null
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          course_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          identifier?: string | null
          phone?: string | null
          profile_completed?: boolean
          roll_number?: string | null
          section_id?: string | null
          semester?: number | null
          specialization?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          course_id: string
          created_at: string
          id: string
          name: string
          semester: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          name: string
          semester: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          name?: string
          semester?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_entries: {
        Row: {
          created_at: string
          day_of_week: number
          faculty_id: string | null
          id: string
          room: string | null
          slot_id: string
          subject_id: string | null
          timetable_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          faculty_id?: string | null
          id?: string
          room?: string | null
          slot_id: string
          subject_id?: string | null
          timetable_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          faculty_id?: string | null
          id?: string
          room?: string | null
          slot_id?: string
          subject_id?: string | null
          timetable_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "timetable_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          kind: string
          label: string
          period_no: number | null
          position: number
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          kind?: string
          label: string
          period_no?: number | null
          position: number
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          kind?: string
          label?: string
          period_no?: number | null
          position?: number
          start_time?: string
        }
        Relationships: []
      }
      timetables: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          published_at: string | null
          section_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          section_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetables_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: true
            referencedRelation: "sections"
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
      current_user_course_id: { Args: never; Returns: string }
      current_user_department_id: { Args: never; Returns: string }
      current_user_section_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "student"
        | "faculty"
        | "hod"
        | "principal"
        | "admin"
        | "placement_cell"
        | "library_staff"
      notice_category:
        | "general"
        | "academic"
        | "exam"
        | "holiday"
        | "placement"
        | "event"
      notice_priority: "normal" | "important" | "urgent"
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
      app_role: [
        "student",
        "faculty",
        "hod",
        "principal",
        "admin",
        "placement_cell",
        "library_staff",
      ],
      notice_category: [
        "general",
        "academic",
        "exam",
        "holiday",
        "placement",
        "event",
      ],
      notice_priority: ["normal", "important", "urgent"],
    },
  },
} as const
