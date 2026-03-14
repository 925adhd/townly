-- Enforce one recommendation per user per question at the DB level
create unique index if not exists recommendation_responses_user_request_unique
  on recommendation_responses(request_id, user_id);
