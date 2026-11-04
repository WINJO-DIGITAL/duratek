
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
            "documents": {
                  Row: {
                    "created_at": string,"finish_id": string | null,"id": string,"storage_path": string,"title": string,"trade_only": boolean,"type": Database["public"]['Enums']["document_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finish_id"?: string | null,"id"?: string,"storage_path": string,"title": string,"trade_only"?: boolean,"type": Database["public"]['Enums']["document_type"]
                  }
                  Update: {
                    "created_at"?: string,"finish_id"?: string | null,"id"?: string,"storage_path"?: string,"title"?: string,"trade_only"?: boolean,"type"?: Database["public"]['Enums']["document_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    }
                  ]
                },"finish_images": {
                  Row: {
                    "alt": string,"blur_data_url": string | null,"finish_id": string,"height": number | null,"id": string,"kind": Database["public"]['Enums']["image_kind"],"sort_order": number,"url": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt": string,"blur_data_url"?: string | null,"finish_id": string,"height"?: number | null,"id"?: string,"kind": Database["public"]['Enums']["image_kind"],"sort_order"?: number,"url": string,"width"?: number | null
                  }
                  Update: {
                    "alt"?: string,"blur_data_url"?: string | null,"finish_id"?: string,"height"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["image_kind"],"sort_order"?: number,"url"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "finish_images_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finish_images_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    }
                  ]
                },"finishes": {
                  Row: {
                    "colour_family": string,"created_at": string,"description": string,"id": string,"is_demo": boolean,"name": string,"published": boolean,"slug": string,"sort_order": number,"specs": NonNullable<Json>,"style": Database["public"]['Enums']["finish_style"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "colour_family": string,"created_at"?: string,"description"?: string,"id"?: string,"is_demo"?: boolean,"name": string,"published"?: boolean,"slug": string,"sort_order"?: number,"specs"?: NonNullable<Json>,"style": Database["public"]['Enums']["finish_style"],"updated_at"?: string
                  }
                  Update: {
                    "colour_family"?: string,"created_at"?: string,"description"?: string,"id"?: string,"is_demo"?: boolean,"name"?: string,"published"?: boolean,"slug"?: string,"sort_order"?: number,"specs"?: NonNullable<Json>,"style"?: Database["public"]['Enums']["finish_style"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"inspiration": {
                  Row: {
                    "alt": string,"blur_data_url": string | null,"finish_ids": (string)[],"height": number | null,"id": string,"image_path": string,"is_demo": boolean,"mood": string,"published": boolean,"sort_order": number,"title": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt"?: string,"blur_data_url"?: string | null,"finish_ids"?: (string)[],"height"?: number | null,"id"?: string,"image_path": string,"is_demo"?: boolean,"mood": string,"published"?: boolean,"sort_order"?: number,"title": string,"width"?: number | null
                  }
                  Update: {
                    "alt"?: string,"blur_data_url"?: string | null,"finish_ids"?: (string)[],"height"?: number | null,"id"?: string,"image_path"?: string,"is_demo"?: boolean,"mood"?: string,"published"?: boolean,"sort_order"?: number,"title"?: string,"width"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"online_retailers": {
                  Row: {
                    "id": string,"logo_path": string | null,"name": string,"published": boolean,"sort_order": number,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"logo_path"?: string | null,"name": string,"published"?: boolean,"sort_order"?: number,"url": string
                  }
                  Update: {
                    "id"?: string,"logo_path"?: string | null,"name"?: string,"published"?: boolean,"sort_order"?: number,"url"?: string
                  }
                  Relationships: [
                    
                  ]
                },"price_overrides": {
                  Row: {
                    "finish_id": string,"price_per_m2_pence": number,"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "finish_id": string,"price_per_m2_pence": number,"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "finish_id"?: string,"price_per_m2_pence"?: number,"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "price_overrides_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_overrides_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    },{
      foreignKeyName: "price_overrides_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"price_tiers": {
                  Row: {
                    "created_at": string,"id": string,"is_demo": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_demo"?: boolean,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_demo"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"prices": {
                  Row: {
                    "finish_id": string,"price_per_m2_pence": number,"tier_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "finish_id": string,"price_per_m2_pence": number,"tier_id": string,"updated_at"?: string
                  }
                  Update: {
                    "finish_id"?: string,"price_per_m2_pence"?: number,"tier_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "prices_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "prices_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    },{
      foreignKeyName: "prices_tier_id_fkey"
      columns: ["tier_id"]
isOneToOne: false
      referencedRelation: "price_tiers"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "company_name": string,"contact_name": string,"created_at": string,"id": string,"is_admin": boolean,"list_as_stockist": boolean,"phone": string | null,"status": Database["public"]['Enums']["profile_status"],"tier_id": string | null,"trade_type": Database["public"]['Enums']["trade_type"] | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_name"?: string,"contact_name"?: string,"created_at"?: string,"id": string,"is_admin"?: boolean,"list_as_stockist"?: boolean,"phone"?: string | null,"status"?: Database["public"]['Enums']["profile_status"],"tier_id"?: string | null,"trade_type"?: Database["public"]['Enums']["trade_type"] | null,"updated_at"?: string
                  }
                  Update: {
                    "company_name"?: string,"contact_name"?: string,"created_at"?: string,"id"?: string,"is_admin"?: boolean,"list_as_stockist"?: boolean,"phone"?: string | null,"status"?: Database["public"]['Enums']["profile_status"],"tier_id"?: string | null,"trade_type"?: Database["public"]['Enums']["trade_type"] | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_tier_id_fkey"
      columns: ["tier_id"]
isOneToOne: false
      referencedRelation: "price_tiers"
      referencedColumns: ["id"]
    }
                  ]
                },"sample_requests": {
                  Row: {
                    "address_line1": string,"address_line2": string | null,"created_at": string,"email": string,"finish_ids": (string)[],"id": string,"marketing_opt_in": boolean,"name": string,"phone": string | null,"postcode": string,"status": Database["public"]['Enums']["sample_status"],"town": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line1": string,"address_line2"?: string | null,"created_at"?: string,"email": string,"finish_ids": (string)[],"id"?: string,"marketing_opt_in"?: boolean,"name": string,"phone"?: string | null,"postcode": string,"status"?: Database["public"]['Enums']["sample_status"],"town": string
                  }
                  Update: {
                    "address_line1"?: string,"address_line2"?: string | null,"created_at"?: string,"email"?: string,"finish_ids"?: (string)[],"id"?: string,"marketing_opt_in"?: boolean,"name"?: string,"phone"?: string | null,"postcode"?: string,"status"?: Database["public"]['Enums']["sample_status"],"town"?: string
                  }
                  Relationships: [
                    
                  ]
                },"shortlists": {
                  Row: {
                    "created_at": string,"finish_ids": (string)[],"id": string,"name": string,"profile_id": string,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finish_ids"?: (string)[],"id"?: string,"name": string,"profile_id": string,"token"?: string
                  }
                  Update: {
                    "created_at"?: string,"finish_ids"?: (string)[],"id"?: string,"name"?: string,"profile_id"?: string,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shortlists_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"stockists": {
                  Row: {
                    "address": string,"created_at": string,"id": string,"lat": number | null,"lng": number | null,"name": string,"phone": string | null,"postcode": string,"published": boolean,"type": Database["public"]['Enums']["stockist_type"],"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"created_at"?: string,"id"?: string,"lat"?: number | null,"lng"?: number | null,"name": string,"phone"?: string | null,"postcode": string,"published"?: boolean,"type": Database["public"]['Enums']["stockist_type"],"website"?: string | null
                  }
                  Update: {
                    "address"?: string,"created_at"?: string,"id"?: string,"lat"?: number | null,"lng"?: number | null,"name"?: string,"phone"?: string | null,"postcode"?: string,"published"?: boolean,"type"?: Database["public"]['Enums']["stockist_type"],"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "my_prices": {
                  Row: {
                    "finish_id": string,"is_account_price": boolean | null,"price_per_m2_pence": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "current_tier_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_shared_shortlist":
{ Args: { "share_token": string }; Returns: {
              "finish_ids": (string)[],"name": string
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_approved_trade":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            "document_type": "tech_sheet"|"warranty"|"certificate"|"fitting_guide"|"brochure","finish_style": "plank"|"herringbone","image_kind": "swatch"|"room"|"closeup","profile_status": "pending"|"approved"|"rejected","sample_status": "new"|"sent","stockist_type": "showroom"|"retailer"|"fitter","trade_type": "fitter"|"retailer"|"contractor"|"specifier"
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
            "document_type": ["tech_sheet", "warranty", "certificate", "fitting_guide", "brochure"],"finish_style": ["plank", "herringbone"],"image_kind": ["swatch", "room", "closeup"],"profile_status": ["pending", "approved", "rejected"],"sample_status": ["new", "sent"],"stockist_type": ["showroom", "retailer", "fitter"],"trade_type": ["fitter", "retailer", "contractor", "specifier"]
          }
        }
} as const
