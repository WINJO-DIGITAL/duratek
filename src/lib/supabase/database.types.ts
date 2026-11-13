
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
            "admin_permissions": {
                  Row: {
                    "granted_at": string,"granted_by": string | null,"permission": Database["public"]['Enums']["admin_permission"],"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"granted_by"?: string | null,"permission": Database["public"]['Enums']["admin_permission"],"profile_id": string
                  }
                  Update: {
                    "granted_at"?: string,"granted_by"?: string | null,"permission"?: Database["public"]['Enums']["admin_permission"],"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_permissions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"actor_role": string | null,"changed_fields": (string)[] | null,"id": number,"new_data": Json | null,"occurred_at": string,"old_data": Json | null,"record_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"actor_role"?: string | null,"changed_fields"?: (string)[] | null,"id"?: never,"new_data"?: Json | null,"occurred_at"?: string,"old_data"?: Json | null,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"actor_role"?: string | null,"changed_fields"?: (string)[] | null,"id"?: never,"new_data"?: Json | null,"occurred_at"?: string,"old_data"?: Json | null,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"businesses": {
                  Row: {
                    "address_line1": string | null,"address_line2": string | null,"business_type": Database["public"]['Enums']["trade_type"] | null,"company_number": string | null,"created_at": string,"id": string,"name": string,"phone": string | null,"postcode": string | null,"town": string | null,"updated_at": string,"vat_number": string | null,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"business_type"?: Database["public"]['Enums']["trade_type"] | null,"company_number"?: string | null,"created_at"?: string,"id"?: string,"name": string,"phone"?: string | null,"postcode"?: string | null,"town"?: string | null,"updated_at"?: string,"vat_number"?: string | null,"website"?: string | null
                  }
                  Update: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"business_type"?: Database["public"]['Enums']["trade_type"] | null,"company_number"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"phone"?: string | null,"postcode"?: string | null,"town"?: string | null,"updated_at"?: string,"vat_number"?: string | null,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"collections": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"is_demo": boolean,"name": string,"published": boolean,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_demo"?: boolean,"name": string,"published"?: boolean,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"is_demo"?: boolean,"name"?: string,"published"?: boolean,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"consent_records": {
                  Row: {
                    "anonymised_at": string | null,"created_at": string,"email": string,"granted": boolean,"id": string,"purpose": string,"source": string,"source_id": string | null,"wording": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anonymised_at"?: string | null,"created_at"?: string,"email": string,"granted": boolean,"id"?: string,"purpose": string,"source": string,"source_id"?: string | null,"wording": string
                  }
                  Update: {
                    "anonymised_at"?: string | null,"created_at"?: string,"email"?: string,"granted"?: boolean,"id"?: string,"purpose"?: string,"source"?: string,"source_id"?: string | null,"wording"?: string
                  }
                  Relationships: [
                    
                  ]
                },"customers": {
                  Row: {
                    "address": string,"created_at": string,"email": string | null,"id": string,"name": string,"notes": string,"phone": string | null,"postcode": string | null,"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"notes"?: string,"phone"?: string | null,"postcode"?: string | null,"profile_id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"notes"?: string,"phone"?: string | null,"postcode"?: string | null,"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "content_type": string,"created_at": string,"finish_id": string | null,"id": string,"size_bytes": number | null,"storage_path": string,"title": string,"trade_only": boolean,"type": Database["public"]['Enums']["document_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "content_type"?: string,"created_at"?: string,"finish_id"?: string | null,"id"?: string,"size_bytes"?: number | null,"storage_path": string,"title": string,"trade_only"?: boolean,"type": Database["public"]['Enums']["document_type"]
                  }
                  Update: {
                    "content_type"?: string,"created_at"?: string,"finish_id"?: string | null,"id"?: string,"size_bytes"?: number | null,"storage_path"?: string,"title"?: string,"trade_only"?: boolean,"type"?: Database["public"]['Enums']["document_type"]
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
                },"enquiries": {
                  Row: {
                    "admin_note": string | null,"anonymised_at": string | null,"created_at": string,"email": string,"finish_id": string | null,"forwarded_at": string | null,"handled_at": string | null,"handled_by": string | null,"id": string,"kind": Database["public"]['Enums']["enquiry_kind"],"message": string,"name": string,"phone": string | null,"postcode": string | null,"share_with_stockist": boolean,"status": Database["public"]['Enums']["enquiry_status"],"stockist_id": string | null,"wants_contact": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"anonymised_at"?: string | null,"created_at"?: string,"email": string,"finish_id"?: string | null,"forwarded_at"?: string | null,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["enquiry_kind"],"message": string,"name": string,"phone"?: string | null,"postcode"?: string | null,"share_with_stockist"?: boolean,"status"?: Database["public"]['Enums']["enquiry_status"],"stockist_id"?: string | null,"wants_contact"?: boolean
                  }
                  Update: {
                    "admin_note"?: string | null,"anonymised_at"?: string | null,"created_at"?: string,"email"?: string,"finish_id"?: string | null,"forwarded_at"?: string | null,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["enquiry_kind"],"message"?: string,"name"?: string,"phone"?: string | null,"postcode"?: string | null,"share_with_stockist"?: boolean,"status"?: Database["public"]['Enums']["enquiry_status"],"stockist_id"?: string | null,"wants_contact"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "enquiries_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enquiries_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    },{
      foreignKeyName: "enquiries_stockist_id_fkey"
      columns: ["stockist_id"]
isOneToOne: false
      referencedRelation: "stockists"
      referencedColumns: ["id"]
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
                },"finish_views": {
                  Row: {
                    "day": string,"finish_id": string,"views": number
                  }
                  ComputedFields: never
                  Insert: {
                    "day"?: string,"finish_id": string,"views"?: number
                  }
                  Update: {
                    "day"?: string,"finish_id"?: string,"views"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "finish_views_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finish_views_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    }
                  ]
                },"finishes": {
                  Row: {
                    "archived_at": string | null,"collection_id": string | null,"colour_family": string,"created_at": string,"description": string,"id": string,"is_demo": boolean,"name": string,"product_type": Database["public"]['Enums']["product_type"],"published": boolean,"rrp_per_m2_pence": number | null,"sample_available": boolean,"slug": string,"sort_order": number,"specs": NonNullable<Json>,"style": Database["public"]['Enums']["finish_style"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"collection_id"?: string | null,"colour_family": string,"created_at"?: string,"description"?: string,"id"?: string,"is_demo"?: boolean,"name": string,"product_type"?: Database["public"]['Enums']["product_type"],"published"?: boolean,"rrp_per_m2_pence"?: number | null,"sample_available"?: boolean,"slug": string,"sort_order"?: number,"specs"?: NonNullable<Json>,"style": Database["public"]['Enums']["finish_style"],"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"collection_id"?: string | null,"colour_family"?: string,"created_at"?: string,"description"?: string,"id"?: string,"is_demo"?: boolean,"name"?: string,"product_type"?: Database["public"]['Enums']["product_type"],"published"?: boolean,"rrp_per_m2_pence"?: number | null,"sample_available"?: boolean,"slug"?: string,"sort_order"?: number,"specs"?: NonNullable<Json>,"style"?: Database["public"]['Enums']["finish_style"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "finishes_collection_id_fkey"
      columns: ["collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id"]
    }
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
                },"notification_log": {
                  Row: {
                    "created_at": string,"id": number,"kind": string,"recipient": string,"related_id": string | null,"related_table": string | null,"status": string,"subject": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"kind": string,"recipient": string,"related_id"?: string | null,"related_table"?: string | null,"status": string,"subject": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"kind"?: string,"recipient"?: string,"related_id"?: string | null,"related_table"?: string | null,"status"?: string,"subject"?: string
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
                },"price_list_items": {
                  Row: {
                    "amount_pence": number,"created_at": string,"created_by": string | null,"id": string,"min_quantity": number,"price_list_id": string,"price_unit": Database["public"]['Enums']["unit_of_sale"],"updated_at": string,"valid_from": string | null,"valid_to": string | null,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_pence": number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"min_quantity"?: number,"price_list_id": string,"price_unit": Database["public"]['Enums']["unit_of_sale"],"updated_at"?: string,"valid_from"?: string | null,"valid_to"?: string | null,"variant_id": string
                  }
                  Update: {
                    "amount_pence"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"min_quantity"?: number,"price_list_id"?: string,"price_unit"?: Database["public"]['Enums']["unit_of_sale"],"updated_at"?: string,"valid_from"?: string | null,"valid_to"?: string | null,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "price_list_items_price_list_id_fkey"
      columns: ["price_list_id"]
isOneToOne: false
      referencedRelation: "price_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_list_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"price_lists": {
                  Row: {
                    "active": boolean,"audience": Database["public"]['Enums']["promotion_audience"] | null,"code": string,"created_at": string,"currency": string,"description": string,"id": string,"is_default": boolean,"is_demo": boolean,"kind": Database["public"]['Enums']["price_list_kind"],"name": string,"prices_include_vat": boolean,"profile_id": string | null,"tier_id": string | null,"updated_at": string,"valid_from": string | null,"valid_to": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"audience"?: Database["public"]['Enums']["promotion_audience"] | null,"code": string,"created_at"?: string,"currency"?: string,"description"?: string,"id"?: string,"is_default"?: boolean,"is_demo"?: boolean,"kind": Database["public"]['Enums']["price_list_kind"],"name": string,"prices_include_vat": boolean,"profile_id"?: string | null,"tier_id"?: string | null,"updated_at"?: string,"valid_from"?: string | null,"valid_to"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"audience"?: Database["public"]['Enums']["promotion_audience"] | null,"code"?: string,"created_at"?: string,"currency"?: string,"description"?: string,"id"?: string,"is_default"?: boolean,"is_demo"?: boolean,"kind"?: Database["public"]['Enums']["price_list_kind"],"name"?: string,"prices_include_vat"?: boolean,"profile_id"?: string | null,"tier_id"?: string | null,"updated_at"?: string,"valid_from"?: string | null,"valid_to"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "price_lists_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_lists_tier_id_fkey"
      columns: ["tier_id"]
isOneToOne: true
      referencedRelation: "price_tiers"
      referencedColumns: ["id"]
    }
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
                },"privacy_requests": {
                  Row: {
                    "anonymised_at": string | null,"created_at": string,"details": string | null,"due_at": string,"email": string,"handled_at": string | null,"handled_by": string | null,"id": string,"kind": string,"outcome_note": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anonymised_at"?: string | null,"created_at"?: string,"details"?: string | null,"due_at"?: string,"email": string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"kind": string,"outcome_note"?: string | null,"status"?: string
                  }
                  Update: {
                    "anonymised_at"?: string | null,"created_at"?: string,"details"?: string | null,"due_at"?: string,"email"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"kind"?: string,"outcome_note"?: string | null,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"product_variants": {
                  Row: {
                    "active": boolean,"created_at": string,"finish_id": string,"id": string,"is_default": boolean,"is_demo": boolean,"length_mm": number | null,"name": string,"pack_coverage_m2": number | null,"sku": string,"sort_order": number,"thickness_mm": number | null,"unit_of_sale": Database["public"]['Enums']["unit_of_sale"],"units_per_pack": number | null,"updated_at": string,"vat_rate_bp": number,"width_mm": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"finish_id": string,"id"?: string,"is_default"?: boolean,"is_demo"?: boolean,"length_mm"?: number | null,"name": string,"pack_coverage_m2"?: number | null,"sku": string,"sort_order"?: number,"thickness_mm"?: number | null,"unit_of_sale": Database["public"]['Enums']["unit_of_sale"],"units_per_pack"?: number | null,"updated_at"?: string,"vat_rate_bp"?: number,"width_mm"?: number | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"finish_id"?: string,"id"?: string,"is_default"?: boolean,"is_demo"?: boolean,"length_mm"?: number | null,"name"?: string,"pack_coverage_m2"?: number | null,"sku"?: string,"sort_order"?: number,"thickness_mm"?: number | null,"unit_of_sale"?: Database["public"]['Enums']["unit_of_sale"],"units_per_pack"?: number | null,"updated_at"?: string,"vat_rate_bp"?: number,"width_mm"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_variants_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "business_id": string | null,"company_name": string,"contact_name": string,"created_at": string,"id": string,"is_admin": boolean,"list_as_stockist": boolean,"phone": string | null,"role": Database["public"]['Enums']["account_role"],"status": Database["public"]['Enums']["profile_status"],"status_changed_at": string | null,"status_changed_by": string | null,"status_reason": string | null,"tier_id": string | null,"trade_type": Database["public"]['Enums']["trade_type"] | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id"?: string | null,"company_name"?: string,"contact_name"?: string,"created_at"?: string,"id": string,"is_admin"?: boolean,"list_as_stockist"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["account_role"],"status"?: Database["public"]['Enums']["profile_status"],"status_changed_at"?: string | null,"status_changed_by"?: string | null,"status_reason"?: string | null,"tier_id"?: string | null,"trade_type"?: Database["public"]['Enums']["trade_type"] | null,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string | null,"company_name"?: string,"contact_name"?: string,"created_at"?: string,"id"?: string,"is_admin"?: boolean,"list_as_stockist"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["account_role"],"status"?: Database["public"]['Enums']["profile_status"],"status_changed_at"?: string | null,"status_changed_by"?: string | null,"status_reason"?: string | null,"tier_id"?: string | null,"trade_type"?: Database["public"]['Enums']["trade_type"] | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_tier_id_fkey"
      columns: ["tier_id"]
isOneToOne: false
      referencedRelation: "price_tiers"
      referencedColumns: ["id"]
    }
                  ]
                },"project_items": {
                  Row: {
                    "area_m2": number | null,"created_at": string,"finish_id": string | null,"id": string,"length_m": number | null,"note": string,"project_id": string,"room_name": string | null,"sort_order": number,"variant_id": string | null,"wastage_pct": number | null,"width_m": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_m2"?: number | null,"created_at"?: string,"finish_id"?: string | null,"id"?: string,"length_m"?: number | null,"note"?: string,"project_id": string,"room_name"?: string | null,"sort_order"?: number,"variant_id"?: string | null,"wastage_pct"?: number | null,"width_m"?: number | null
                  }
                  Update: {
                    "area_m2"?: number | null,"created_at"?: string,"finish_id"?: string | null,"id"?: string,"length_m"?: number | null,"note"?: string,"project_id"?: string,"room_name"?: string | null,"sort_order"?: number,"variant_id"?: string | null,"wastage_pct"?: number | null,"width_m"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_items_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_items_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    },{
      foreignKeyName: "project_items_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "archived": boolean,"created_at": string,"customer_id": string | null,"customer_name": string | null,"id": string,"name": string,"notes": string,"profile_id": string,"site_postcode": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"customer_id"?: string | null,"customer_name"?: string | null,"id"?: string,"name": string,"notes"?: string,"profile_id"?: string,"site_postcode"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"customer_id"?: string | null,"customer_name"?: string | null,"id"?: string,"name"?: string,"notes"?: string,"profile_id"?: string,"site_postcode"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"quote_lines": {
                  Row: {
                    "area_m2": number | null,"created_at": string,"description": string,"finish_id": string | null,"id": string,"kind": Database["public"]['Enums']["quote_line_kind"],"quantity": number,"quote_id": string,"room_name": string | null,"sort_order": number,"unit": Database["public"]['Enums']["quote_unit"],"unit_cost_pence": number,"unit_sell_pence": number,"wastage_pct": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area_m2"?: number | null,"created_at"?: string,"description": string,"finish_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["quote_line_kind"],"quantity": number,"quote_id": string,"room_name"?: string | null,"sort_order"?: number,"unit": Database["public"]['Enums']["quote_unit"],"unit_cost_pence"?: number,"unit_sell_pence": number,"wastage_pct"?: number | null
                  }
                  Update: {
                    "area_m2"?: number | null,"created_at"?: string,"description"?: string,"finish_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["quote_line_kind"],"quantity"?: number,"quote_id"?: string,"room_name"?: string | null,"sort_order"?: number,"unit"?: Database["public"]['Enums']["quote_unit"],"unit_cost_pence"?: number,"unit_sell_pence"?: number,"wastage_pct"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_lines_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quote_lines_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    },{
      foreignKeyName: "quote_lines_quote_id_fkey"
      columns: ["quote_id"]
isOneToOne: false
      referencedRelation: "quotes"
      referencedColumns: ["id"]
    }
                  ]
                },"quotes": {
                  Row: {
                    "contingency_bp": number,"created_at": string,"customer_email": string | null,"customer_id": string | null,"customer_name": string,"customer_phone": string | null,"id": string,"notes": string,"profile_id": string,"project_id": string | null,"reference": string,"responded_at": string | null,"sent_at": string | null,"share_token": string,"site_address": string,"site_postcode": string | null,"status": Database["public"]['Enums']["quote_status"],"updated_at": string,"valid_until": string | null,"vat_rate_bp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "contingency_bp"?: number,"created_at"?: string,"customer_email"?: string | null,"customer_id"?: string | null,"customer_name": string,"customer_phone"?: string | null,"id"?: string,"notes"?: string,"profile_id"?: string,"project_id"?: string | null,"reference"?: string,"responded_at"?: string | null,"sent_at"?: string | null,"share_token"?: string,"site_address"?: string,"site_postcode"?: string | null,"status"?: Database["public"]['Enums']["quote_status"],"updated_at"?: string,"valid_until"?: string | null,"vat_rate_bp"?: number
                  }
                  Update: {
                    "contingency_bp"?: number,"created_at"?: string,"customer_email"?: string | null,"customer_id"?: string | null,"customer_name"?: string,"customer_phone"?: string | null,"id"?: string,"notes"?: string,"profile_id"?: string,"project_id"?: string | null,"reference"?: string,"responded_at"?: string | null,"sent_at"?: string | null,"share_token"?: string,"site_address"?: string,"site_postcode"?: string | null,"status"?: Database["public"]['Enums']["quote_status"],"updated_at"?: string,"valid_until"?: string | null,"vat_rate_bp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotes_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotes_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"sample_requests": {
                  Row: {
                    "address_line1": string,"address_line2": string | null,"anonymised_at": string | null,"carrier": string | null,"created_at": string,"customer_notified_at": string | null,"dispatch_note": string | null,"dispatched_by": string | null,"email": string,"finish_ids": (string)[],"id": string,"marketing_opt_in": boolean,"name": string,"phone": string | null,"postcode": string,"sent_at": string | null,"status": Database["public"]['Enums']["sample_status"],"town": string,"tracking_ref": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line1": string,"address_line2"?: string | null,"anonymised_at"?: string | null,"carrier"?: string | null,"created_at"?: string,"customer_notified_at"?: string | null,"dispatch_note"?: string | null,"dispatched_by"?: string | null,"email": string,"finish_ids": (string)[],"id"?: string,"marketing_opt_in"?: boolean,"name": string,"phone"?: string | null,"postcode": string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["sample_status"],"town": string,"tracking_ref"?: string | null
                  }
                  Update: {
                    "address_line1"?: string,"address_line2"?: string | null,"anonymised_at"?: string | null,"carrier"?: string | null,"created_at"?: string,"customer_notified_at"?: string | null,"dispatch_note"?: string | null,"dispatched_by"?: string | null,"email"?: string,"finish_ids"?: (string)[],"id"?: string,"marketing_opt_in"?: boolean,"name"?: string,"phone"?: string | null,"postcode"?: string,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["sample_status"],"town"?: string,"tracking_ref"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"saved_products": {
                  Row: {
                    "created_at": string,"finish_id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finish_id": string,"profile_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"finish_id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_products_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_products_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    },{
      foreignKeyName: "saved_products_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                },"stockist_private": {
                  Row: {
                    "admin_note": string | null,"lead_email": string | null,"payment_terms": string | null,"price_list_id": string | null,"stockist_id": string,"terms_note": string | null,"terms_valid_from": string | null,"terms_valid_to": string | null,"updated_at": string,"verification_note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_note"?: string | null,"lead_email"?: string | null,"payment_terms"?: string | null,"price_list_id"?: string | null,"stockist_id": string,"terms_note"?: string | null,"terms_valid_from"?: string | null,"terms_valid_to"?: string | null,"updated_at"?: string,"verification_note"?: string | null
                  }
                  Update: {
                    "admin_note"?: string | null,"lead_email"?: string | null,"payment_terms"?: string | null,"price_list_id"?: string | null,"stockist_id"?: string,"terms_note"?: string | null,"terms_valid_from"?: string | null,"terms_valid_to"?: string | null,"updated_at"?: string,"verification_note"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stockist_private_price_list_id_fkey"
      columns: ["price_list_id"]
isOneToOne: false
      referencedRelation: "price_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stockist_private_stockist_id_fkey"
      columns: ["stockist_id"]
isOneToOne: true
      referencedRelation: "stockists"
      referencedColumns: ["id"]
    }
                  ]
                },"stockist_products": {
                  Row: {
                    "created_at": string,"finish_id": string,"stockist_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finish_id": string,"stockist_id": string
                  }
                  Update: {
                    "created_at"?: string,"finish_id"?: string,"stockist_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stockist_products_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "finishes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stockist_products_finish_id_fkey"
      columns: ["finish_id"]
isOneToOne: false
      referencedRelation: "my_prices"
      referencedColumns: ["finish_id"]
    },{
      foreignKeyName: "stockist_products_stockist_id_fkey"
      columns: ["stockist_id"]
isOneToOne: false
      referencedRelation: "stockists"
      referencedColumns: ["id"]
    }
                  ]
                },"stockists": {
                  Row: {
                    "address": string,"created_at": string,"description": string | null,"email": string | null,"id": string,"lat": number | null,"lng": number | null,"name": string,"opening_hours": string | null,"phone": string | null,"postcode": string,"profile_id": string | null,"published": boolean,"type": Database["public"]['Enums']["stockist_type"],"verified_at": string | null,"verified_by": string | null,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"created_at"?: string,"description"?: string | null,"email"?: string | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"name": string,"opening_hours"?: string | null,"phone"?: string | null,"postcode": string,"profile_id"?: string | null,"published"?: boolean,"type": Database["public"]['Enums']["stockist_type"],"verified_at"?: string | null,"verified_by"?: string | null,"website"?: string | null
                  }
                  Update: {
                    "address"?: string,"created_at"?: string,"description"?: string | null,"email"?: string | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"name"?: string,"opening_hours"?: string | null,"phone"?: string | null,"postcode"?: string,"profile_id"?: string | null,"published"?: boolean,"type"?: Database["public"]['Enums']["stockist_type"],"verified_at"?: string | null,"verified_by"?: string | null,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stockists_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"system_settings": {
                  Row: {
                    "description": string,"is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string,"is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string,"is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"trade_applications": {
                  Row: {
                    "additional_info": string,"business_id": string | null,"decision_note": string | null,"id": string,"profile_id": string,"reviewed_at": string | null,"reviewed_by": string | null,"submitted_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "additional_info"?: string,"business_id"?: string | null,"decision_note"?: string | null,"id"?: string,"profile_id": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"submitted_at"?: string
                  }
                  Update: {
                    "additional_info"?: string,"business_id"?: string | null,"decision_note"?: string | null,"id"?: string,"profile_id"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"submitted_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trade_applications_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trade_applications_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"trade_preferences": {
                  Row: {
                    "address": string | null,"brand_colour": string | null,"contact_email": string | null,"contact_phone": string | null,"default_markup_bp": number,"default_wastage_pct": number,"display_name": string | null,"labour_per_m2_pence": number | null,"logo_path": string | null,"profile_id": string,"quote_footer": string,"updated_at": string,"vat_registered": boolean,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"brand_colour"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"default_markup_bp"?: number,"default_wastage_pct"?: number,"display_name"?: string | null,"labour_per_m2_pence"?: number | null,"logo_path"?: string | null,"profile_id"?: string,"quote_footer"?: string,"updated_at"?: string,"vat_registered"?: boolean,"website"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"brand_colour"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"default_markup_bp"?: number,"default_wastage_pct"?: number,"display_name"?: string | null,"labour_per_m2_pence"?: number | null,"logo_path"?: string | null,"profile_id"?: string,"quote_footer"?: string,"updated_at"?: string,"vat_registered"?: boolean,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "trade_preferences_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
            "_resolve_price":
{ Args: { "p_at": string,"p_quantity": number,"p_uid": string,"p_variant": string }; Returns: {
              "amount_pence": number,"currency": string,"gross_pence": number,"is_promotion": boolean,"min_quantity": number,"net_pence": number,"price_list_id": string,"price_unit": Database["public"]['Enums']["unit_of_sale"],"prices_include_vat": boolean,"rrp_amount_pence": number,"rrp_includes_vat": boolean,"rrp_price_unit": Database["public"]['Enums']["unit_of_sale"],"source": Database["public"]['Enums']["price_list_kind"],"variant_id": string,"vat_rate_bp": number
            }[]
                           },
"admin_analytics":
{ Args: { "p_days"?: number }; Returns: Json
                           },
"admin_dashboard_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"backfill_foundation":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"catalogue_prices":
{ Args: Record<PropertyKey, never>; Returns: {
              "amount_pence": number,"currency": string,"finish_id": string,"gross_pence": number,"is_promotion": boolean,"net_pence": number,"price_unit": Database["public"]['Enums']["unit_of_sale"],"prices_include_vat": boolean,"rrp_amount_pence": number,"rrp_includes_vat": boolean,"source": Database["public"]['Enums']["price_list_kind"],"variant_id": string,"vat_rate_bp": number
            }[]
                           },
"current_tier_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"delete_trade_account":
{ Args: { "p_profile": string }; Returns: undefined
                           },
"erase_person_data":
{ Args: { "p_email": string }; Returns: Json
                           },
"export_person_data":
{ Args: { "p_email": string }; Returns: Json
                           },
"get_shared_quote":
{ Args: { "p_token": string }; Returns: Json
                           },
"get_shared_shortlist":
{ Args: { "share_token": string }; Returns: {
              "finish_ids": (string)[],"name": string
            }[]
                           },
"has_permission":
{ Args: { "p": Database["public"]['Enums']["admin_permission"] }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_approved_trade":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_super_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"my_permissions":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["admin_permission"][]
                           },
"price_for":
{ Args: { "p_at"?: string,"p_quantity"?: number,"p_variant": string }; Returns: {
              "amount_pence": number,"currency": string,"gross_pence": number,"is_promotion": boolean,"min_quantity": number,"net_pence": number,"price_list_id": string,"price_unit": Database["public"]['Enums']["unit_of_sale"],"prices_include_vat": boolean,"rrp_amount_pence": number,"rrp_includes_vat": boolean,"rrp_price_unit": Database["public"]['Enums']["unit_of_sale"],"source": Database["public"]['Enums']["price_list_kind"],"variant_id": string,"vat_rate_bp": number
            }[]
                           },
"price_for_account":
{ Args: { "p_at"?: string,"p_profile": string,"p_quantity"?: number,"p_variant": string }; Returns: {
              "amount_pence": number,"currency": string,"gross_pence": number,"is_promotion": boolean,"min_quantity": number,"net_pence": number,"price_list_id": string,"price_unit": Database["public"]['Enums']["unit_of_sale"],"prices_include_vat": boolean,"rrp_amount_pence": number,"rrp_includes_vat": boolean,"rrp_price_unit": Database["public"]['Enums']["unit_of_sale"],"source": Database["public"]['Enums']["price_list_kind"],"variant_id": string,"vat_rate_bp": number
            }[]
                           },
"price_history":
{ Args: { "p_limit"?: number }; Returns: {
              "action": string,"actor": string,"list_name": string,"new_pence": number,"occurred_at": string,"old_pence": number,"sku": string,"valid_from": string,"valid_to": string
            }[]
                           },
"privacy_allowed":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"purge_expired_personal_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"record_finish_view":
{ Args: { "p_slug": string }; Returns: undefined
                           },
"redact_audit":
{ Args: { "p_ids": (string)[],"p_table": string }; Returns: undefined
                           },
"refresh_legacy_prices":
{ Args: { "p_finish": string }; Returns: undefined
                           },
"respond_to_quote":
{ Args: { "p_decision": string,"p_token": string }; Returns: string
                           },
"set_sample_availability":
{ Args: { "p_available": boolean,"p_finish": string }; Returns: undefined
                           }
          }
          Enums: {
            "account_role": "super_admin"|"admin"|"trade"|"stockist","admin_permission": "manage_accounts"|"manage_pricing"|"manage_products"|"manage_stockists"|"manage_samples"|"manage_documents"|"manage_settings"|"view_reports"|"view_audit","document_type": "tech_sheet"|"warranty"|"certificate"|"fitting_guide"|"brochure"|"marketing_photo"|"brand_asset","enquiry_kind": "stockist"|"product"|"contact","enquiry_status": "new"|"contacted"|"closed"|"spam","finish_style": "plank"|"herringbone","image_kind": "swatch"|"room"|"closeup","price_list_kind": "rrp"|"trade"|"stockist"|"account"|"promotion","product_type": "flooring"|"accessory","profile_status": "pending"|"approved"|"rejected"|"suspended","promotion_audience": "public"|"trade"|"stockist"|"all","quote_line_kind": "flooring"|"accessory"|"labour"|"other"|"underlay"|"trim"|"adhesive"|"delivery"|"expense","quote_status": "draft"|"sent"|"accepted"|"declined","quote_unit": "pack"|"m2"|"item"|"hour"|"metre","sample_status": "new"|"sent"|"processing"|"cancelled","stockist_type": "showroom"|"retailer"|"fitter","trade_type": "fitter"|"retailer"|"contractor"|"specifier","unit_of_sale": "m2"|"pack"|"item"|"linear_metre"
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
            "account_role": ["super_admin", "admin", "trade", "stockist"],"admin_permission": ["manage_accounts", "manage_pricing", "manage_products", "manage_stockists", "manage_samples", "manage_documents", "manage_settings", "view_reports", "view_audit"],"document_type": ["tech_sheet", "warranty", "certificate", "fitting_guide", "brochure", "marketing_photo", "brand_asset"],"enquiry_kind": ["stockist", "product", "contact"],"enquiry_status": ["new", "contacted", "closed", "spam"],"finish_style": ["plank", "herringbone"],"image_kind": ["swatch", "room", "closeup"],"price_list_kind": ["rrp", "trade", "stockist", "account", "promotion"],"product_type": ["flooring", "accessory"],"profile_status": ["pending", "approved", "rejected", "suspended"],"promotion_audience": ["public", "trade", "stockist", "all"],"quote_line_kind": ["flooring", "accessory", "labour", "other", "underlay", "trim", "adhesive", "delivery", "expense"],"quote_status": ["draft", "sent", "accepted", "declined"],"quote_unit": ["pack", "m2", "item", "hour", "metre"],"sample_status": ["new", "sent", "processing", "cancelled"],"stockist_type": ["showroom", "retailer", "fitter"],"trade_type": ["fitter", "retailer", "contractor", "specifier"],"unit_of_sale": ["m2", "pack", "item", "linear_metre"]
          }
        }
} as const
