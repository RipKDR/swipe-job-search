-- Enums for Hi-Hired MVP

create type user_role as enum ('candidate', 'employer');
create type job_type as enum ('casual', 'part_time', 'permanent');
create type job_status as enum ('active', 'hired', 'expired', 'paused');
create type swipe_direction as enum ('right', 'left');
create type match_status as enum ('chatting', 'hire_pending', 'hired', 'unmatched', 'archived');
create type notification_status as enum ('pending', 'processing', 'sent', 'failed');
create type report_reason as enum (
  'spam', 'harassment', 'misleading_job', 'inappropriate_content', 'other'
);
create type report_status as enum ('pending', 'reviewed', 'action_taken', 'dismissed');
