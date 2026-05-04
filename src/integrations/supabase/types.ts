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
      admin_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          feature: Database["public"]["Enums"]["permission_feature"]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          feature: Database["public"]["Enums"]["permission_feature"]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          feature?: Database["public"]["Enums"]["permission_feature"]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance_corrections: {
        Row: {
          attendance_id: string
          branch_id: string
          created_at: string
          current_value: string | null
          field: Database["public"]["Enums"]["correction_field"]
          id: string
          reason: string
          requested_value: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: Database["public"]["Enums"]["correction_status"]
          submitted_by: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          attendance_id: string
          branch_id: string
          created_at?: string
          current_value?: string | null
          field: Database["public"]["Enums"]["correction_field"]
          id?: string
          reason: string
          requested_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: Database["public"]["Enums"]["correction_status"]
          submitted_by: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          attendance_id?: string
          branch_id?: string
          created_at?: string
          current_value?: string | null
          field?: Database["public"]["Enums"]["correction_field"]
          id?: string
          reason?: string
          requested_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: Database["public"]["Enums"]["correction_status"]
          submitted_by?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          branch_id: string
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          id: string
          is_deleted: boolean
          late_minutes: number
          notes: string | null
          overtime_minutes: number
          status: Database["public"]["Enums"]["attendance_status"]
          therapist_id: string
          undertime_minutes: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          id?: string
          is_deleted?: boolean
          late_minutes?: number
          notes?: string | null
          overtime_minutes?: number
          status?: Database["public"]["Enums"]["attendance_status"]
          therapist_id: string
          undertime_minutes?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          id?: string
          is_deleted?: boolean
          late_minutes?: number
          notes?: string | null
          overtime_minutes?: number
          status?: Database["public"]["Enums"]["attendance_status"]
          therapist_id?: string
          undertime_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          branch_id: string | null
          created_at: string
          entity: string
          id: string
          metadata: Json | null
          new_value: Json | null
          previous_value: Json | null
          record_id: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action_type: string
          branch_id?: string | null
          created_at?: string
          entity: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
          record_id?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action_type?: string
          branch_id?: string | null
          created_at?: string
          entity?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          previous_value?: Json | null
          record_id?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      booking_addons: {
        Row: {
          addon_id: string
          booking_id: string
          created_at: string
          id: string
          price: number
        }
        Insert: {
          addon_id: string
          booking_id: string
          created_at?: string
          id?: string
          price?: number
        }
        Update: {
          addon_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          price?: number
        }
        Relationships: []
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["booking_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address_barangay: string | null
          address_city: string | null
          address_line1: string | null
          address_line2: string | null
          address_province: string | null
          address_region: string | null
          booking_date: string
          booking_type: Database["public"]["Enums"]["booking_type"]
          branch_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_minutes: number | null
          end_time: string
          id: string
          is_deleted: boolean
          is_home_service: boolean
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          room_id: string | null
          service_address: string | null
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          therapist_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          address_barangay?: string | null
          address_city?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_province?: string | null
          address_region?: string | null
          booking_date?: string
          booking_type?: Database["public"]["Enums"]["booking_type"]
          branch_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_minutes?: number | null
          end_time: string
          id?: string
          is_deleted?: boolean
          is_home_service?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          room_id?: string | null
          service_address?: string | null
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          therapist_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          address_barangay?: string | null
          address_city?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_province?: string | null
          address_region?: string | null
          booking_date?: string
          booking_type?: Database["public"]["Enums"]["booking_type"]
          branch_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_minutes?: number | null
          end_time?: string
          id?: string
          is_deleted?: boolean
          is_home_service?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          room_id?: string | null
          service_address?: string | null
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          therapist_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_admins: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_admins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          closing_time: string
          contact_number: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          opening_time: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          closing_time?: string
          contact_number?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          opening_time?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          closing_time?: string
          contact_number?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          opening_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          booking_id: string | null
          branch_id: string
          created_at: string
          earned_date: string
          id: string
          payment_id: string | null
          rate: number
          therapist_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          branch_id: string
          created_at?: string
          earned_date?: string
          id?: string
          payment_id?: string | null
          rate: number
          therapist_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          branch_id?: string
          created_at?: string
          earned_date?: string
          id?: string
          payment_id?: string | null
          rate?: number
          therapist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_memberships: {
        Row: {
          created_at: string
          customer_id: string
          end_date: string | null
          id: string
          plan_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          end_date?: string | null
          id?: string
          plan_id: string
          start_date?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          end_date?: string | null
          id?: string
          plan_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          allergies: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          duplicate_override_note: string | null
          email: string | null
          full_name: string
          has_allergy: boolean
          id: string
          is_deleted: boolean
          last_visit_date: string | null
          notes: string | null
          phone: string | null
          preferred_therapist_id: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          duplicate_override_note?: string | null
          email?: string | null
          full_name: string
          has_allergy?: boolean
          id?: string
          is_deleted?: boolean
          last_visit_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_therapist_id?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          duplicate_override_note?: string | null
          email?: string | null
          full_name?: string
          has_allergy?: boolean
          id?: string
          is_deleted?: boolean
          last_visit_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_therapist_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_preferred_therapist_id_fkey"
            columns: ["preferred_therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          recipient_id: string
          related_entity: string | null
          related_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          recipient_id: string
          related_entity?: string | null
          related_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          recipient_id?: string
          related_entity?: string | null
          related_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          branch_id: string
          created_at: string
          customer_id: string | null
          date_paid: string | null
          deleted_at: string | null
          deleted_by: string | null
          discount: number
          final_amount: number
          id: string
          is_deleted: boolean
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          therapist_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          branch_id: string
          created_at?: string
          customer_id?: string | null
          date_paid?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount?: number
          final_amount?: number
          id?: string
          is_deleted?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          therapist_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          branch_id?: string
          created_at?: string
          customer_id?: string | null
          date_paid?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount?: number
          final_amount?: number
          id?: string
          is_deleted?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          therapist_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_barangays: {
        Row: {
          city_id: string
          id: string
          name: string
        }
        Insert: {
          city_id: string
          id?: string
          name: string
        }
        Update: {
          city_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ph_barangays_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "ph_cities"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_cities: {
        Row: {
          code: string
          id: string
          name: string
          province_id: string
        }
        Insert: {
          code: string
          id?: string
          name: string
          province_id: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
          province_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ph_cities_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "ph_provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_provinces: {
        Row: {
          code: string
          id: string
          name: string
          region_id: string
        }
        Insert: {
          code: string
          id?: string
          name: string
          region_id: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ph_provinces_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "ph_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_regions: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      service_addons: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_branch_pricing: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          price: number
          service_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          price: number
          service_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          price?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_branch_pricing_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_branch_pricing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_durations: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          price: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          price?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          price?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price: number
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      therapist_schedules: {
        Row: {
          break_end: string | null
          break_start: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_off: boolean
          start_time: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_off?: boolean
          start_time: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_off?: boolean
          start_time?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_schedules_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_skills: {
        Row: {
          id: string
          service_id: string
          therapist_id: string
        }
        Insert: {
          id?: string
          service_id: string
          therapist_id: string
        }
        Update: {
          id?: string
          service_id?: string
          therapist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_skills_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_skills_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapists: {
        Row: {
          branch_id: string | null
          commission_rate: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          employment_status: Database["public"]["Enums"]["therapist_status"]
          full_name: string
          id: string
          is_deleted: boolean
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          commission_rate?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          employment_status?: Database["public"]["Enums"]["therapist_status"]
          full_name: string
          id?: string
          is_deleted?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          commission_rate?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          employment_status?: Database["public"]["Enums"]["therapist_status"]
          full_name?: string
          id?: string
          is_deleted?: boolean
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapists_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
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
      check_booking_conflicts: {
        Args: {
          _end: string
          _exclude_id?: string
          _start: string
          _therapist_id: string
        }
        Returns: {
          detail: string
          reason: string
        }[]
      }
      has_permission: {
        Args: {
          _action: string
          _feature: Database["public"]["Enums"]["permission_feature"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      user_branch_ids: { Args: { _user_id: string }; Returns: string[] }
      user_has_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin"
      attendance_status: "present" | "absent" | "late" | "leave" | "off_duty"
      booking_status:
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      booking_type: "walk_in" | "phone" | "online" | "repeat"
      correction_field: "clock_in" | "clock_out" | "status"
      correction_status: "pending_owner_review" | "approved" | "rejected"
      payment_method:
        | "cash"
        | "card"
        | "gcash"
        | "maya"
        | "bank_transfer"
        | "other"
      payment_status:
        | "unpaid"
        | "partially_paid"
        | "paid"
        | "refunded"
        | "cancelled"
      permission_feature:
        | "bookings"
        | "customers"
        | "therapists"
        | "attendance"
        | "payments"
        | "reports"
        | "services_pricing"
        | "audit_log"
      service_category: "massage" | "package" | "add_on" | "home_service"
      therapist_status: "active" | "inactive" | "on_leave"
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
      app_role: ["owner", "admin"],
      attendance_status: ["present", "absent", "late", "leave", "off_duty"],
      booking_status: [
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      booking_type: ["walk_in", "phone", "online", "repeat"],
      correction_field: ["clock_in", "clock_out", "status"],
      correction_status: ["pending_owner_review", "approved", "rejected"],
      payment_method: [
        "cash",
        "card",
        "gcash",
        "maya",
        "bank_transfer",
        "other",
      ],
      payment_status: [
        "unpaid",
        "partially_paid",
        "paid",
        "refunded",
        "cancelled",
      ],
      permission_feature: [
        "bookings",
        "customers",
        "therapists",
        "attendance",
        "payments",
        "reports",
        "services_pricing",
        "audit_log",
      ],
      service_category: ["massage", "package", "add_on", "home_service"],
      therapist_status: ["active", "inactive", "on_leave"],
    },
  },
} as const
