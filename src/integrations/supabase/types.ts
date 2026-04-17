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
      diagram_folders: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagram_folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagram_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "diagram_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      diagram_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagram_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      diagram_templates: {
        Row: {
          connections: Json
          created_at: string
          created_by: string | null
          description: string | null
          equipment: Json
          id: string
          name: string
          settings: Json | null
          thumbnail: string | null
          updated_at: string
          zones: Json
        }
        Insert: {
          connections?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment?: Json
          id?: string
          name: string
          settings?: Json | null
          thumbnail?: string | null
          updated_at?: string
          zones?: Json
        }
        Update: {
          connections?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment?: Json
          id?: string
          name?: string
          settings?: Json | null
          thumbnail?: string | null
          updated_at?: string
          zones?: Json
        }
        Relationships: []
      }
      diagrams: {
        Row: {
          connections: Json
          created_at: string
          created_by: string | null
          description: string | null
          equipment: Json
          folder_id: string | null
          id: string
          is_public: boolean
          name: string
          organization_id: string | null
          public_token: string | null
          settings: Json | null
          thumbnail: string | null
          updated_at: string
          zones: Json
        }
        Insert: {
          connections?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment?: Json
          folder_id?: string | null
          id?: string
          is_public?: boolean
          name: string
          organization_id?: string | null
          public_token?: string | null
          settings?: Json | null
          thumbnail?: string | null
          updated_at?: string
          zones?: Json
        }
        Update: {
          connections?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment?: Json
          folder_id?: string | null
          id?: string
          is_public?: boolean
          name?: string
          organization_id?: string | null
          public_token?: string | null
          settings?: Json | null
          thumbnail?: string | null
          updated_at?: string
          zones?: Json
        }
        Relationships: [
          {
            foreignKeyName: "diagrams_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "diagram_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagrams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      diagrams_tags: {
        Row: {
          diagram_id: string
          tag_id: string
        }
        Insert: {
          diagram_id: string
          tag_id: string
        }
        Update: {
          diagram_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagrams_tags_diagram_id_fkey"
            columns: ["diagram_id"]
            isOneToOne: false
            referencedRelation: "diagrams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagrams_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "diagram_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_library: {
        Row: {
          border_color: string | null
          category: string
          created_at: string
          description: string | null
          header_background_color: string | null
          icon: string
          id: string
          is_default: boolean
          label: string
          manufacturer_id: string | null
          name: string
          organization_id: string | null
          protocol: string
          quantity: number | null
          reference: string | null
          type: string
          updated_at: string
        }
        Insert: {
          border_color?: string | null
          category: string
          created_at?: string
          description?: string | null
          header_background_color?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          label: string
          manufacturer_id?: string | null
          name: string
          organization_id?: string | null
          protocol: string
          quantity?: number | null
          reference?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          border_color?: string | null
          category?: string
          created_at?: string
          description?: string | null
          header_background_color?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          label?: string
          manufacturer_id?: string | null
          name?: string
          organization_id?: string | null
          protocol?: string
          quantity?: number | null
          reference?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_library_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_product_references: {
        Row: {
          created_at: string
          description: string | null
          equipment_type: string
          id: string
          manufacturer_id: string
          reference: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          equipment_type: string
          id?: string
          manufacturer_id: string
          reference: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          equipment_type?: string
          id?: string
          manufacturer_id?: string
          reference?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_product_references_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_references: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reference: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reference: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reference?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment_styles: {
        Row: {
          background_color: string
          border_color: string
          border_radius: number
          border_width: number
          created_at: string
          equipment_type: string | null
          icon_color: string
          id: string
          is_default: boolean
          name: string
          opacity: number
          text_color: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          border_color?: string
          border_radius?: number
          border_width?: number
          created_at?: string
          equipment_type?: string | null
          icon_color?: string
          id?: string
          is_default?: boolean
          name: string
          opacity?: number
          text_color?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          border_color?: string
          border_radius?: number
          border_width?: number
          created_at?: string
          equipment_type?: string | null
          icon_color?: string
          id?: string
          is_default?: boolean
          name?: string
          opacity?: number
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role_v2"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role_v2"]
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role_v2"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          created_at: string
          equipment_type: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_type: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_type?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role_v2"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role_v2"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role_v2"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          is_default: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          is_default?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          is_default?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      can_manage_library: { Args: { _user_id: string }; Returns: boolean }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      get_user_organizations: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_org: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role_v2"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_v2: {
        Args: {
          _role: Database["public"]["Enums"]["app_role_v2"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor" | "reader" | "library_admin"
      app_role_v2: "owner" | "org_admin" | "member"
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
      app_role: ["admin", "editor", "reader", "library_admin"],
      app_role_v2: ["owner", "org_admin", "member"],
    },
  },
} as const
