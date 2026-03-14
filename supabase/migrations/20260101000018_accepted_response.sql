-- Store which specific response the asker accepted as their answer
alter table recommendation_requests
  add column if not exists accepted_response_id uuid references recommendation_responses(id) on delete set null;
