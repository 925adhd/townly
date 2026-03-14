-- Allow reviewers to mark whether an owner reply resolved their issue
alter table review_replies
  add column if not exists resolved_by_reviewer boolean default null;
