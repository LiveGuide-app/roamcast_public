

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_guide_ratings"("input_guide_id" "uuid") RETURNS TABLE("average_rating" numeric, "total_reviews" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH guide_ratings AS (
    SELECT f.rating
    FROM tours t
    JOIN feedback f ON t.id = f.tour_id
    WHERE t.guide_id = input_guide_id
    AND f.rating IS NOT NULL
    AND f.deleted_at IS NULL
  )
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 1) as average_rating,
    COUNT(*) as total_reviews
  FROM guide_ratings;
END;
$$;


ALTER FUNCTION "public"."calculate_guide_ratings"("input_guide_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_guide_stats"("guide_id" "uuid") RETURNS TABLE("total_tours" bigint, "total_guests" bigint, "total_earnings" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
BEGIN
  RETURN QUERY
  WITH 
    -- Count tours independently
    tour_count AS (
      SELECT COUNT(*) as count
      FROM tours t
      WHERE t.guide_id = $1
      AND t.deleted_at IS NULL
    ),
    -- Count participants independently
    guest_count AS (
      SELECT COUNT(DISTINCT tp.id) as count
      FROM tours t
      JOIN tour_participants tp ON t.id = tp.tour_id
      WHERE t.guide_id = $1
      AND t.deleted_at IS NULL
      AND tp.deleted_at IS NULL
    ),
    -- Sum tips independently
    earnings_sum AS (
      SELECT COALESCE(SUM(tt.amount), 0) as sum
      FROM tours t
      JOIN tour_participants tp ON t.id = tp.tour_id
      JOIN tour_tips tt ON tp.id = tt.tour_participant_id
      WHERE t.guide_id = $1
      AND t.deleted_at IS NULL
      AND tp.deleted_at IS NULL
      AND tt.deleted_at IS NULL
      AND tt.status = 'succeeded'
    )
  SELECT 
    tour_count.count as total_tours,
    guest_count.count as total_guests,
    earnings_sum.sum as total_earnings
  FROM tour_count, guest_count, earnings_sum;
END;
$_$;


ALTER FUNCTION "public"."calculate_guide_stats"("guide_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_active_tour"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.status = 'active' THEN
        IF EXISTS (
            SELECT 1 FROM tours 
            WHERE guide_id = NEW.guide_id 
            AND status = 'active'
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'Guide already has an active tour';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_active_tour"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_tour_limit_for_guide"("p_guide_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_stripe_enabled boolean;
    v_tour_count integer;
BEGIN
    -- Check if guide has completed Stripe onboarding
    SELECT stripe_account_enabled INTO v_stripe_enabled
    FROM users
    WHERE id = p_guide_id;

    -- If guide is onboarded, no limit applies
    IF v_stripe_enabled THEN
        RETURN true;
    END IF;

    -- Count tours in last 7 days
    SELECT COUNT(*) INTO v_tour_count
    FROM tours
    WHERE guide_id = p_guide_id
    AND created_at >= NOW() - INTERVAL '7 days'
    AND deleted_at IS NULL;

    RETURN v_tour_count < 2;
END;
$$;


ALTER FUNCTION "public"."check_tour_limit_for_guide"("p_guide_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."tours" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "guide_id" "uuid",
    "name" "text",
    "unique_code" "text",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "deleted_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "current_participants" integer DEFAULT 0,
    "total_participants" integer DEFAULT 0,
    "livekit_room_id" "text",
    "livekit_room_status" "text" DEFAULT 'pending'::"text",
    "room_started_at" timestamp with time zone,
    "room_finished_at" timestamp with time zone,
    "livekit_guide_joined" timestamp with time zone,
    "livekit_guide_left" timestamp with time zone,
    CONSTRAINT "tours_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "valid_dates" CHECK (("created_at" <= "updated_at"))
);


ALTER TABLE "public"."tours" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tours"."room_started_at" IS 'Timestamp when the LiveKit room for this tour started';



COMMENT ON COLUMN "public"."tours"."room_finished_at" IS 'Timestamp when the LiveKit room for this tour finished';



COMMENT ON COLUMN "public"."tours"."livekit_guide_joined" IS 'Timestamp when the guide joined the LiveKit room';



COMMENT ON COLUMN "public"."tours"."livekit_guide_left" IS 'Timestamp when the guide left the LiveKit room';



CREATE OR REPLACE FUNCTION "public"."create_tour"("p_guide_id" "uuid", "p_name" "text") RETURNS "public"."tours"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tour tours;
BEGIN
    -- Check tour limit for non-onboarded guides
    IF NOT check_tour_limit_for_guide(p_guide_id) THEN
        RAISE EXCEPTION 'Maximum of 2 tours within 7 days allowed for non-onboarded guides';
    END IF;

    -- Check for active tours (existing check)
    PERFORM check_active_tour();

    -- Create the tour if both checks pass
    INSERT INTO tours (guide_id, name, unique_code, status)
    VALUES (
        p_guide_id,
        p_name,
        generate_unique_code(),
        'pending'
    )
    RETURNING * INTO v_tour;

    RETURN v_tour;
END;
$$;


ALTER FUNCTION "public"."create_tour"("p_guide_id" "uuid", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_unique_tour_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  code text;
  exists boolean;
begin
  loop
    -- Generate a 6-digit number between 100000 and 999999
    code := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
    
    -- Check if code exists
    select exists(select 1 from tours where unique_code = code) into exists;
    
    -- If code doesn't exist, return it
    if not exists then
      return code;
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."generate_unique_tour_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_tour_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Only proceed if the tour status is being changed to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Update all participants without a leave_time to have the current timestamp
        UPDATE tour_participants
        SET leave_time = CURRENT_TIMESTAMP
        WHERE tour_id = NEW.id
        AND leave_time IS NULL;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_tour_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tour_participant_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Update current_participants (participants without leave_time)
    UPDATE tours
    SET current_participants = (
        SELECT COUNT(DISTINCT device_id)
        FROM tour_participants
        WHERE tour_id = NEW.tour_id
        AND leave_time IS NULL
    )
    WHERE id = NEW.tour_id;

    -- Update total_participants (all unique participants)
    UPDATE tours
    SET total_participants = (
        SELECT COUNT(DISTINCT device_id)
        FROM tour_participants
        WHERE tour_id = NEW.tour_id
    )
    WHERE id = NEW.tour_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tour_participant_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tour_participant_counts_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Update current_participants (participants without leave_time)
    UPDATE tours
    SET current_participants = (
        SELECT COUNT(DISTINCT device_id)
        FROM tour_participants
        WHERE tour_id = OLD.tour_id
        AND leave_time IS NULL
    )
    WHERE id = OLD.tour_id;

    -- Update total_participants (all unique participants)
    UPDATE tours
    SET total_participants = (
        SELECT COUNT(DISTINCT device_id)
        FROM tour_participants
        WHERE tour_id = OLD.tour_id
    )
    WHERE id = OLD.tour_id;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."update_tour_participant_counts_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tour_id" "uuid" NOT NULL,
    "device_id" "text" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "has_tipped" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tour_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tour_id" "uuid",
    "device_id" "text",
    "join_time" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "leave_time" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "deleted_at" timestamp with time zone,
    "livekit_joined_room" timestamp with time zone,
    "livekit_left_room" timestamp with time zone
);


ALTER TABLE "public"."tour_participants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tour_participants"."livekit_joined_room" IS 'Timestamp when the participant joined the LiveKit room';



COMMENT ON COLUMN "public"."tour_participants"."livekit_left_room" IS 'Timestamp when the participant left the LiveKit room';



CREATE TABLE IF NOT EXISTS "public"."tour_tips" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tour_participant_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "currency" "text" NOT NULL,
    "status" "text" NOT NULL,
    "payment_intent_id" "text",
    "application_fee_amount" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "deleted_at" timestamp with time zone,
    "stripe_account_id" "text",
    "checkout_session_id" "text",
    CONSTRAINT "tour_tips_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'succeeded'::"text", 'failed'::"text", 'requires_payment_method'::"text", 'requires_confirmation'::"text", 'open'::"text", 'complete'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."tour_tips" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tour_tips"."stripe_account_id" IS 'The Stripe Connect account ID of the guide receiving the tip';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "deleted_at" timestamp with time zone,
    "stripe_account_id" "text",
    "stripe_account_enabled" boolean DEFAULT false,
    "stripe_account_created_at" timestamp with time zone,
    "stripe_account_updated_at" timestamp with time zone,
    "stripe_payouts_enabled" boolean,
    "stripe_details_submitted" boolean,
    "stripe_default_currency" "text" DEFAULT 'gbp'::"text",
    "profile_image_url" "text",
    "recommendations_link" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."stripe_account_id" IS 'The Stripe Connect account ID for the tour guide';



COMMENT ON COLUMN "public"."users"."stripe_account_enabled" IS 'Whether the Stripe Connect account is enabled for accepting payments';



COMMENT ON COLUMN "public"."users"."stripe_account_created_at" IS 'When the Stripe Connect account was created';



COMMENT ON COLUMN "public"."users"."stripe_account_updated_at" IS 'When the Stripe Connect account was last updated';



COMMENT ON COLUMN "public"."users"."recommendations_link" IS 'External link to guide recommendations document';



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_tour_id_device_id_key" UNIQUE ("tour_id", "device_id");



ALTER TABLE ONLY "public"."tour_participants"
    ADD CONSTRAINT "tour_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tour_tips"
    ADD CONSTRAINT "tour_tips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tours"
    ADD CONSTRAINT "tours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tours"
    ADD CONSTRAINT "tours_unique_code_key" UNIQUE ("unique_code");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_tour_participants_livekit_joined_room" ON "public"."tour_participants" USING "btree" ("livekit_joined_room");



CREATE INDEX "idx_tour_participants_livekit_left_room" ON "public"."tour_participants" USING "btree" ("livekit_left_room");



CREATE INDEX "idx_tours_livekit_guide_joined" ON "public"."tours" USING "btree" ("livekit_guide_joined");



CREATE INDEX "idx_tours_livekit_guide_left" ON "public"."tours" USING "btree" ("livekit_guide_left");



CREATE INDEX "idx_tours_room_started_at" ON "public"."tours" USING "btree" ("room_started_at");



CREATE INDEX "idx_users_stripe_account_id" ON "public"."users" USING "btree" ("stripe_account_id");



CREATE UNIQUE INDEX "one_active_tour_per_guide" ON "public"."tours" USING "btree" ("guide_id") WHERE ("status" = 'active'::"text");



CREATE UNIQUE INDEX "one_successful_tip_per_participant" ON "public"."tour_tips" USING "btree" ("tour_participant_id") WHERE ("status" = 'succeeded'::"text");



CREATE INDEX "tour_participants_tour_id_idx" ON "public"."tour_participants" USING "btree" ("tour_id");



CREATE INDEX "tours_guide_id_idx" ON "public"."tours" USING "btree" ("guide_id");



CREATE INDEX "tours_unique_code_idx" ON "public"."tours" USING "btree" ("unique_code");



CREATE INDEX "users_email_idx" ON "public"."users" USING "btree" ("email");



CREATE OR REPLACE TRIGGER "ensure_one_active_tour" BEFORE INSERT OR UPDATE ON "public"."tours" FOR EACH ROW EXECUTE FUNCTION "public"."check_active_tour"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."tour_participants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."tour_tips" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."tours" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tour_completion_trigger" AFTER UPDATE ON "public"."tours" FOR EACH ROW EXECUTE FUNCTION "public"."handle_tour_completion"();



CREATE OR REPLACE TRIGGER "update_tour_participant_counts_delete" AFTER DELETE ON "public"."tour_participants" FOR EACH ROW EXECUTE FUNCTION "public"."update_tour_participant_counts_delete"();



CREATE OR REPLACE TRIGGER "update_tour_participant_counts_insert" AFTER INSERT ON "public"."tour_participants" FOR EACH ROW EXECUTE FUNCTION "public"."update_tour_participant_counts"();



CREATE OR REPLACE TRIGGER "update_tour_participant_counts_update" AFTER UPDATE ON "public"."tour_participants" FOR EACH ROW EXECUTE FUNCTION "public"."update_tour_participant_counts"();



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id");



ALTER TABLE ONLY "public"."tour_participants"
    ADD CONSTRAINT "tour_participants_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id");



ALTER TABLE ONLY "public"."tour_tips"
    ADD CONSTRAINT "tour_tips_tour_participant_id_fkey" FOREIGN KEY ("tour_participant_id") REFERENCES "public"."tour_participants"("id");



ALTER TABLE ONLY "public"."tours"
    ADD CONSTRAINT "tours_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



CREATE POLICY "Access own tips" ON "public"."tour_tips" USING (("auth"."uid"() IN ( SELECT "tours"."guide_id"
   FROM "public"."tours"
  WHERE ("tours"."id" IN ( SELECT "tour_participants"."tour_id"
           FROM "public"."tour_participants"
          WHERE ("tour_participants"."id" = "tour_tips"."tour_participant_id")))
UNION
 SELECT "tours"."guide_id"
   FROM ("public"."tour_participants"
     JOIN "public"."tours" ON (("tours"."id" = "tour_participants"."tour_id")))
  WHERE (("tour_participants"."id" = "tour_tips"."tour_participant_id") AND ("tour_participants"."device_id" = (("current_setting"('request.jwt.claims'::"text"))::"json" ->> 'device_id'::"text"))))));



CREATE POLICY "Anyone can insert participants for active and pending tours" ON "public"."tour_participants" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tours"
  WHERE (("tours"."id" = "tour_participants"."tour_id") AND ("tours"."status" = ANY (ARRAY['active'::"text", 'pending'::"text"]))))));



CREATE POLICY "Anyone can read active, pending, and recently completed tours" ON "public"."tours" USING ((("status" = 'active'::"text") OR ("status" = 'pending'::"text") OR (("status" = 'completed'::"text") AND ("completed_at" >= ("now"() - '7 days'::interval)))));



CREATE POLICY "Anyone can read participants for active, pending, and completed" ON "public"."tour_participants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tours"
  WHERE (("tours"."id" = "tour_participants"."tour_id") AND ("tours"."status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'completed'::"text"]))))));



CREATE POLICY "Guides can create tours" ON "public"."tours" FOR INSERT WITH CHECK (("auth"."uid"() = "guide_id"));



CREATE POLICY "Guides can read own tours" ON "public"."tours" FOR SELECT USING (("auth"."uid"() = "guide_id"));



CREATE POLICY "Guides can update own tours" ON "public"."tours" FOR UPDATE USING (("auth"."uid"() = "guide_id"));



CREATE POLICY "Participants can manage feedback" ON "public"."feedback" USING ((EXISTS ( SELECT 1
   FROM "public"."tours"
  WHERE (("tours"."id" = "feedback"."tour_id") AND ("tours"."status" = 'completed'::"text")))));



CREATE POLICY "Participants can update their own leave time" ON "public"."tour_participants" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."tours"
  WHERE (("tours"."id" = "tour_participants"."tour_id") AND ("tours"."status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'completed'::"text"])))))) WITH CHECK (((("leave_time" IS NOT NULL) AND ("leave_time" IS DISTINCT FROM "leave_time")) OR (NOT ("leave_time" IS DISTINCT FROM "leave_time"))));



CREATE POLICY "Read stripe_account_id of guides" ON "public"."users" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tours"
  WHERE ("tours"."guide_id" = "users"."id"))));



CREATE POLICY "Users can insert their own data" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can read own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tour_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tour_tips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tours";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."calculate_guide_ratings"("input_guide_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_guide_ratings"("input_guide_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_guide_ratings"("input_guide_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_guide_stats"("guide_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_guide_stats"("guide_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_guide_stats"("guide_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_active_tour"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_active_tour"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_active_tour"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_tour_limit_for_guide"("p_guide_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_tour_limit_for_guide"("p_guide_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tour_limit_for_guide"("p_guide_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."tours" TO "anon";
GRANT ALL ON TABLE "public"."tours" TO "authenticated";
GRANT ALL ON TABLE "public"."tours" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tour"("p_guide_id" "uuid", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_tour"("p_guide_id" "uuid", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tour"("p_guide_id" "uuid", "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_tour_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_tour_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_tour_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_tour_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_tour_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_tour_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tour_participant_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tour_participant_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tour_participant_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tour_participant_counts_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tour_participant_counts_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tour_participant_counts_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."tour_participants" TO "anon";
GRANT ALL ON TABLE "public"."tour_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."tour_participants" TO "service_role";



GRANT ALL ON TABLE "public"."tour_tips" TO "anon";
GRANT ALL ON TABLE "public"."tour_tips" TO "authenticated";
GRANT ALL ON TABLE "public"."tour_tips" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
