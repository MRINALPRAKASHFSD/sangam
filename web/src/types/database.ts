
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"consent_records": {
                  Row: {
                    "created_at": string,"granted": boolean,"id": number,"policy_version": string,"purpose": Database["public"]['Enums']["consent_purpose"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"granted": boolean,"id"?: number,"policy_version"?: string,"purpose": Database["public"]['Enums']["consent_purpose"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"granted"?: boolean,"id"?: number,"policy_version"?: string,"purpose"?: Database["public"]['Enums']["consent_purpose"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consent_records_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"filters": {
                  Row: {
                    "category": Database["public"]['Enums']["filter_category"],"created_at": string,"created_by": string | null,"id": string,"is_trending": boolean,"kind": Database["public"]['Enums']["filter_kind"],"name": string,"params": NonNullable<Json>,"slug": string,"sort": number,"status": Database["public"]['Enums']["tag_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["filter_category"],"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_trending"?: boolean,"kind"?: Database["public"]['Enums']["filter_kind"],"name": string,"params"?: NonNullable<Json>,"slug": string,"sort"?: number,"status"?: Database["public"]['Enums']["tag_status"]
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["filter_category"],"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_trending"?: boolean,"kind"?: Database["public"]['Enums']["filter_kind"],"name"?: string,"params"?: NonNullable<Json>,"slug"?: string,"sort"?: number,"status"?: Database["public"]['Enums']["tag_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "filters_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"media_assets": {
                  Row: {
                    "bucket": string,"bytes": number,"created_at": string,"duration_ms": number | null,"expires_at": string | null,"filter_slug": string | null,"height": number | null,"id": string,"kind": Database["public"]['Enums']["media_kind"],"mime": string,"moderation_status": Database["public"]['Enums']["moderation_status"],"owner_id": string,"path": string,"thumb_path": string | null,"visibility": Database["public"]['Enums']["media_visibility"],"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket"?: string,"bytes": number,"created_at"?: string,"duration_ms"?: number | null,"expires_at"?: string | null,"filter_slug"?: string | null,"height"?: number | null,"id"?: string,"kind": Database["public"]['Enums']["media_kind"],"mime": string,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"owner_id"?: string,"path": string,"thumb_path"?: string | null,"visibility"?: Database["public"]['Enums']["media_visibility"],"width"?: number | null
                  }
                  Update: {
                    "bucket"?: string,"bytes"?: number,"created_at"?: string,"duration_ms"?: number | null,"expires_at"?: string | null,"filter_slug"?: string | null,"height"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["media_kind"],"mime"?: string,"moderation_status"?: Database["public"]['Enums']["moderation_status"],"owner_id"?: string,"path"?: string,"thumb_path"?: string | null,"visibility"?: Database["public"]['Enums']["media_visibility"],"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_assets_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "age_band": Database["public"]['Enums']["age_band"] | null,"avatar_path": string | null,"bio": string | null,"birth_year": number | null,"created_at": string,"deletion_requested_at": string | null,"display_name": string | null,"id": string,"is_private": boolean,"onboarded_at": string | null,"points_balance": number,"role": Database["public"]['Enums']["app_role"],"suspended_at": string | null,"updated_at": string,"username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "age_band"?: Database["public"]['Enums']["age_band"] | null,"avatar_path"?: string | null,"bio"?: string | null,"birth_year"?: number | null,"created_at"?: string,"deletion_requested_at"?: string | null,"display_name"?: string | null,"id": string,"is_private"?: boolean,"onboarded_at"?: string | null,"points_balance"?: number,"role"?: Database["public"]['Enums']["app_role"],"suspended_at"?: string | null,"updated_at"?: string,"username"?: string | null
                  }
                  Update: {
                    "age_band"?: Database["public"]['Enums']["age_band"] | null,"avatar_path"?: string | null,"bio"?: string | null,"birth_year"?: number | null,"created_at"?: string,"deletion_requested_at"?: string | null,"display_name"?: string | null,"id"?: string,"is_private"?: boolean,"onboarded_at"?: string | null,"points_balance"?: number,"role"?: Database["public"]['Enums']["app_role"],"suspended_at"?: string | null,"updated_at"?: string,"username"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"tag_categories": {
                  Row: {
                    "id": number,"name": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"name": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "id"?: number,"name"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"tags": {
                  Row: {
                    "category_id": number | null,"created_at": string,"created_by": string | null,"emoji": string | null,"follower_count": number,"id": string,"is_official": boolean,"name": string,"slug": string,"status": Database["public"]['Enums']["tag_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: number | null,"created_at"?: string,"created_by"?: string | null,"emoji"?: string | null,"follower_count"?: number,"id"?: string,"is_official"?: boolean,"name": string,"slug": string,"status"?: Database["public"]['Enums']["tag_status"]
                  }
                  Update: {
                    "category_id"?: number | null,"created_at"?: string,"created_by"?: string | null,"emoji"?: string | null,"follower_count"?: number,"id"?: string,"is_official"?: boolean,"name"?: string,"slug"?: string,"status"?: Database["public"]['Enums']["tag_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "tags_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "tag_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tags_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_preferences": {
                  Row: {
                    "allow_messages_from": Database["public"]['Enums']["message_audience"],"discoverable": boolean,"language": string,"low_data_mode": boolean,"read_receipts": boolean,"theme": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_messages_from"?: Database["public"]['Enums']["message_audience"],"discoverable"?: boolean,"language"?: string,"low_data_mode"?: boolean,"read_receipts"?: boolean,"theme"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "allow_messages_from"?: Database["public"]['Enums']["message_audience"],"discoverable"?: boolean,"language"?: string,"low_data_mode"?: boolean,"read_receipts"?: boolean,"theme"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_tags": {
                  Row: {
                    "created_at": string,"is_public": boolean,"tag_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"is_public"?: boolean,"tag_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"is_public"?: boolean,"tag_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_tags_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cancel_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"complete_onboarding":
{ Args: { "p_birth_year": number,"p_consents": Json,"p_display_name": string,"p_public_tag_ids": (string)[],"p_tag_ids": (string)[],"p_username": string }; Returns: {
              "age_band": Database["public"]['Enums']["age_band"] | null,
"avatar_path": string | null,
"bio": string | null,
"birth_year": number | null,
"created_at": string,
"deletion_requested_at": string | null,
"display_name": string | null,
"id": string,
"is_private": boolean,
"onboarded_at": string | null,
"points_balance": number,
"role": Database["public"]['Enums']["app_role"],
"suspended_at": string | null,
"updated_at": string,
"username": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_tag":
{ Args: { "p_category_slug": string,"p_name": string }; Returns: {
              "category_id": number | null,
"created_at": string,
"created_by": string | null,
"emoji": string | null,
"follower_count": number,
"id": string,
"is_official": boolean,
"name": string,
"slug": string,
"status": Database["public"]['Enums']["tag_status"]
            }
                          SetofOptions: {
        from: "*"
        to: "tags"
        isOneToOne: true
        isSetofReturn: false
      } },
"discover_people":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_tag_id"?: string }; Returns: {
              "avatar_path": string,"bio": string,"display_name": string,"shared_count": number,"shared_tags": Json,"user_id": string,"username": string
            }[]
                           },
"export_my_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_public_profile":
{ Args: { "p_username": string }; Returns: Json
                           },
"has_consent":
{ Args: { "p_purpose": Database["public"]['Enums']["consent_purpose"],"p_user": string }; Returns: boolean
                           },
"is_blocked_between":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"my_blocked_users":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_path": string,"blocked_at": string,"display_name": string,"user_id": string,"username": string
            }[]
                           },
"my_consents":
{ Args: Record<PropertyKey, never>; Returns: {
              "granted": boolean,"policy_version": string,"purpose": Database["public"]['Enums']["consent_purpose"],"updated_at": string
            }[]
                           },
"request_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"set_consent":
{ Args: { "p_granted": boolean,"p_purpose": Database["public"]['Enums']["consent_purpose"] }; Returns: undefined
                           },
"trending_tags":
{ Args: { "p_limit"?: number }; Returns: {
              "category_slug": string,"emoji": string,"follower_count": number,"id": string,"name": string,"recent_joins": number,"slug": string
            }[]
                           },
"username_available":
{ Args: { "p_username": string }; Returns: boolean
                           }
          }
          Enums: {
            "age_band": "minor"|"adult","app_role": "user"|"moderator"|"admin","consent_purpose": "core_service"|"interest_discovery"|"personalisation"|"product_analytics"|"marketing"|"parental_consent","filter_category": "face"|"beauty"|"color"|"vintage"|"cinematic"|"artistic"|"funny"|"background"|"text"|"trending"|"community","filter_kind": "canvas"|"ar","media_kind": "image"|"video","media_visibility": "private"|"friends"|"public","message_audience": "friends"|"shared_tags"|"nobody","moderation_status": "pending"|"approved"|"rejected"|"under_review","tag_status": "active"|"pending"|"banned"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "age_band": ["minor", "adult"],"app_role": ["user", "moderator", "admin"],"consent_purpose": ["core_service", "interest_discovery", "personalisation", "product_analytics", "marketing", "parental_consent"],"filter_category": ["face", "beauty", "color", "vintage", "cinematic", "artistic", "funny", "background", "text", "trending", "community"],"filter_kind": ["canvas", "ar"],"media_kind": ["image", "video"],"media_visibility": ["private", "friends", "public"],"message_audience": ["friends", "shared_tags", "nobody"],"moderation_status": ["pending", "approved", "rejected", "under_review"],"tag_status": ["active", "pending", "banned"]
          }
        }
} as const
