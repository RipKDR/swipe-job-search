-- Add 'applied' to swipe_direction enum
-- Represents user clicking "Apply Now" and opening the external job listing

alter type swipe_direction add value if not exists 'applied';
