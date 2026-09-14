// TypeScript types ที่ตรงกับ supabase/migrations/0001_init_v1_schema.sql (V1 core)
//
// นี่คือ type ที่เขียนมือให้ตรงกับ schema ตอนเริ่มโปรเจกต์ เพื่อให้ scaffold นี้
// compile และใช้งานได้ทันทีโดยไม่ต้องมี Supabase project จริงก่อน
// แนะนำอย่างยิ่งให้แทนที่ไฟล์นี้ด้วย type ที่ generate จริงทันทีที่มี Supabase
// project แล้ว:
//
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
//
// (ยังไม่ได้ใส่ตารางฝั่ง V2 / 0002_v2_extension_schema.sql ในไฟล์นี้ — ใส่เพิ่ม
// เมื่อเริ่มต่อฟีเจอร์ฝั่งนั้นจริง)

export type ChallengeType = "PERSONAL" | "LIFE";
export type MeasurementType =
  | "YES_NO"
  | "COUNT"
  | "DISTANCE"
  | "TIME"
  | "NUMBER"
  | "SCORE"
  | "CHECKLIST"
  | "CUSTOM";
export type CheckinFrequency = "DAILY" | "WEEKLY" | "CUSTOM";
export type PrivacyLevel = "PUBLIC" | "SUPPORTERS" | "PRIVATE";
export type ChallengeStatus =
  | "DRAFT"
  | "ACTIVE"
  | "NEEDS_PUSH"
  | "RESCUE"
  | "NOT_YET"
  | "COMPLETED";
export type PushPermission = "NOBODY" | "SUPPORTERS" | "COMMUNITY";
export type DarumaRarityTier =
  | "SMALL_7D"
  | "CLASSIC_30D"
  | "SPECIAL_100D"
  | "LEGENDARY_365D"
  | "CUSTOM";
export type MilestoneStatus = "LOCKED" | "IN_PROGRESS" | "DONE";
export type SupporterStatus = "INVITED" | "ACTIVE" | "MUTED" | "REMOVED";
export type CommentStatus = "VISIBLE" | "HIDDEN_BY_OWNER" | "HIDDEN_BY_MOD" | "DELETED";

export interface PrivacyFields {
  show_progress: boolean;
  show_checkins: boolean;
  show_photos: boolean;
  show_comments: boolean;
  show_health_data: boolean;
}

export interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  language: "TH" | "EN";
  default_push_permission: PushPermission;
  notifications_enabled: boolean;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  created_at: string;
  updated_at: string;
  // ── เชื่อมกับ LINE (migration 0012) ──
  // line_user_id แก้จากฝั่งแอปไม่ได้ (มี trigger กันไว้) — เขียนได้เฉพาะ
  // เซิร์ฟเวอร์หลังยืนยันตัวตนกับ LINE แล้วเท่านั้น
  line_user_id?: string | null;
  line_picture_url?: string | null;
  line_notify_enabled?: boolean;
}

export interface ChallengeRow {
  id: string;
  owner_id: string;
  type: ChallengeType;
  title: string;
  description: string | null;
  category: string;
  goal_description: string;
  measurement_type: MeasurementType;
  measurement_unit: string | null;
  target_value: number | null;
  original_goal_snapshot: Record<string, unknown> | null;
  checkin_frequency: CheckinFrequency;
  start_date: string;
  planned_end_date: string | null;
  reward_text: string | null;
  privacy_level: PrivacyLevel;
  privacy_fields: PrivacyFields;
  push_permission: PushPermission;
  status: ChallengeStatus;
  is_global: boolean;
  public_invite_token: string;
  created_at: string;
  updated_at: string;
}

export interface ChallengeAttemptRow {
  id: string;
  challenge_id: string;
  attempt_number: number;
  status: ChallengeStatus;
  started_at: string;
  ended_at: string | null;
  best_streak: number;
  created_at: string;
}

export interface DarumaRow {
  id: string;
  challenge_id: string;
  left_eye_filled_at: string | null;
  right_eye_filled_at: string | null;
  rarity_tier: DarumaRarityTier | null;
  is_limited_sponsor_edition: boolean;
  sponsor_edition_ref: string | null;
  kintsugi_variant: boolean;
  created_at: string;
}

export interface MilestoneRow {
  id: string;
  challenge_id: string;
  daruma_id: string | null;
  title: string;
  target_description: string | null;
  order_index: number;
  status: MilestoneStatus;
  completed_at: string | null;
}

export interface CheckInRow {
  id: string;
  challenge_attempt_id: string;
  checkin_date: string;
  value_bool: boolean | null;
  value_number: number | null;
  value_checklist: { item: string; done: boolean }[] | null;
  note: string | null;
  media_url: string | null;
  created_at: string;
}

export interface CheerRow {
  id: string;
  challenge_id: string;
  user_id: string;
  created_at: string;
}

export interface CommentRow {
  id: string;
  challenge_id: string;
  user_id: string;
  body: string;
  status: CommentStatus;
  created_at: string;
}

export interface SupporterRow {
  id: string;
  challenge_id: string;
  user_id: string;
  invited_by: string;
  status: SupporterStatus;
  visibility_scope: Record<string, unknown> | null;
  created_at: string;
  responded_at: string | null;
}

export interface HelpRequestRow {
  id: string;
  challenge_id: string;
  requester_id: string;
  body: string;
  visibility: "SUPPORTERS" | "COMMUNITY";
  status: "OPEN" | "ANSWERED" | "CLOSED";
  created_at: string;
}

export interface GlobalChallengeRow {
  id: string;
  sponsor_id: string | null;
  title: string;
  description: string;
  category: string;
  goal_description: string;
  measurement_type: MeasurementType;
  target_value: number | null;
  start_date: string;
  end_date: string;
  capacity: number | null;
  eligibility_rules: Record<string, unknown> | null;
  reward_text: string;
  reward_type: "GUARANTEED" | "NONE";
  has_limited_daruma: boolean;
  limited_daruma_total: number | null;
  limited_daruma_claimed: number;
  terms_url: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  created_at: string;
}

export type ParticipantStatus =
  | "JOINED"
  | "ACTIVE"
  | "COMPLETED"
  | "REWARD_ISSUED"
  | "REWARD_REDEEMED"
  | "ENDED_NOT_MET"
  | "CONVERTED_TO_PERSONAL";

export interface GlobalChallengeParticipantRow {
  id: string;
  global_challenge_id: string;
  user_id: string;
  challenge_attempt_id: string;
  consent_accepted_at: string;
  status: ParticipantStatus;
  reward_code: string | null;
  converted_challenge_id: string | null;
  joined_at: string;
}

export interface HelpReplyRow {
  id: string;
  help_request_id: string;
  helper_id: string;
  body: string;
  marked_helpful: boolean;
  created_at: string;
}

export type CommunityBadgeType =
  | "EXPERIENCED_HELPER"
  | "COMMUNITY_GUIDE"
  | "VERIFIED_PROFESSIONAL"
  | "EXPERT";

export interface ExpertiseTagRow {
  id: string;
  user_id: string;
  category: string;
  label: string;
  created_at: string;
}

export interface CommunityBadgeRow {
  id: string;
  user_id: string;
  badge: CommunityBadgeType;
  granted_at: string;
  granted_by: "SYSTEM" | "ADMIN";
}

export interface PushEventRow {
  id: string;
  challenge_id: string;
  challenge_attempt_id: string;
  pusher_user_id: string;
  created_at: string;
}

export interface RescueStateRow {
  id: string;
  challenge_attempt_id: string;
  triggered_at: string;
  resolved_at: string | null;
  push_count_at_trigger: number;
}

export type AchievementType =
  | "IM_BACK"
  | "SECOND_TRY"
  | "NEVER_GIVE_UP"
  | "FINALLY"
  | "CHEER_LEADER"
  | "MOTIVATOR"
  | "NEVER_WALK_ALONE"
  | "RESCUER"
  | "HELPING_HAND"
  | "COMMUNITY_GUIDE_100"
  | "DARUMA_MAKER";

export interface AchievementRow {
  id: string;
  user_id: string;
  type: AchievementType;
  related_challenge_id: string | null;
  earned_at: string;
}

export type ShareCardType = "START" | "PROGRESS" | "IM_BACK" | "COMPLETE" | "MILESTONE";

export interface ShareCardRow {
  id: string;
  challenge_id: string;
  type: ShareCardType;
  image_url: string | null;
  deep_link: string | null;
  created_at: string;
}

export interface ExtensionRow {
  id: string;
  challenge_attempt_id: string;
  days_added: number;
  created_at: string;
}

// ฟีเจอร์ "ท้าเพื่อน" (0004_challenge_invites.sql)
export type ChallengeInviteChannel = "IN_APP" | "LINK";
export type ChallengeInviteStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface ChallengeInviteRow {
  id: string;
  challenge_id: string;
  inviter_id: string;
  invitee_user_id: string | null;
  channel: ChallengeInviteChannel;
  message: string | null;
  status: ChallengeInviteStatus;
  resulting_challenge_id: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface InvitePreview {
  challenge_id: string;
  title: string;
  goal_description: string;
  reward_text: string | null;
  category: string;
  type: ChallengeType;
  inviter_display_name: string;
  /** คนที่เปิดลิงก์อยู่ตอนนี้คือเจ้าของคำท้าเองหรือเปล่า (ดู migration 0013) */
  is_own_challenge: boolean;
}

// Minimal Supabase-style Database interface — เพียงพอให้ createClient<Database>()
// ใช้งานได้; ขยายเพิ่มเมื่อ generate type จริงจาก Supabase CLI
export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow> & { id: string; display_name: string }; Update: Partial<ProfileRow> };
      challenges: { Row: ChallengeRow; Insert: Partial<ChallengeRow>; Update: Partial<ChallengeRow> };
      challenge_attempts: { Row: ChallengeAttemptRow; Insert: Partial<ChallengeAttemptRow>; Update: Partial<ChallengeAttemptRow> };
      daruma: { Row: DarumaRow; Insert: Partial<DarumaRow>; Update: Partial<DarumaRow> };
      milestones: { Row: MilestoneRow; Insert: Partial<MilestoneRow>; Update: Partial<MilestoneRow> };
      check_ins: { Row: CheckInRow; Insert: Partial<CheckInRow>; Update: Partial<CheckInRow> };
      cheers: { Row: CheerRow; Insert: Partial<CheerRow>; Update: Partial<CheerRow> };
      comments: { Row: CommentRow; Insert: Partial<CommentRow>; Update: Partial<CommentRow> };
      supporters: { Row: SupporterRow; Insert: Partial<SupporterRow>; Update: Partial<SupporterRow> };
      help_requests: { Row: HelpRequestRow; Insert: Partial<HelpRequestRow>; Update: Partial<HelpRequestRow> };
      help_replies: { Row: HelpReplyRow; Insert: Partial<HelpReplyRow>; Update: Partial<HelpReplyRow> };
      global_challenges: { Row: GlobalChallengeRow; Insert: Partial<GlobalChallengeRow>; Update: Partial<GlobalChallengeRow> };
      global_challenge_participants: {
        Row: GlobalChallengeParticipantRow;
        Insert: Partial<GlobalChallengeParticipantRow>;
        Update: Partial<GlobalChallengeParticipantRow>;
      };
      expertise_tags: { Row: ExpertiseTagRow; Insert: Partial<ExpertiseTagRow>; Update: Partial<ExpertiseTagRow> };
      community_badges: { Row: CommunityBadgeRow; Insert: Partial<CommunityBadgeRow>; Update: Partial<CommunityBadgeRow> };
      push_events: { Row: PushEventRow; Insert: Partial<PushEventRow>; Update: Partial<PushEventRow> };
      rescue_states: { Row: RescueStateRow; Insert: Partial<RescueStateRow>; Update: Partial<RescueStateRow> };
      achievements: { Row: AchievementRow; Insert: Partial<AchievementRow>; Update: Partial<AchievementRow> };
      share_cards: { Row: ShareCardRow; Insert: Partial<ShareCardRow>; Update: Partial<ShareCardRow> };
      extensions: { Row: ExtensionRow; Insert: Partial<ExtensionRow>; Update: Partial<ExtensionRow> };
      challenge_invites: { Row: ChallengeInviteRow; Insert: Partial<ChallengeInviteRow>; Update: Partial<ChallengeInviteRow> };
    };
    Functions: {
      evaluate_challenge_lifecycle: {
        Args: Record<string, never>;
        Returns: { moved_to_needs_push: number; moved_to_rescue: number; moved_to_not_yet: number }[];
      };
      get_invite_preview: {
        Args: { p_token: string };
        Returns: InvitePreview[];
      };
      accept_challenge_invite: {
        Args: { p_token: string };
        Returns: string;
      };
      invite_friend_to_challenge: {
        Args: { p_challenge_id: string; p_invitee_user_id: string; p_message?: string | null };
        Returns: string;
      };
      respond_to_challenge_invite: {
        Args: { p_invite_id: string; p_accept: boolean };
        Returns: string | null;
      };
    };
  };
}
