-- Native app push: tag each subscription with where it came from.
-- 'web' rows use VAPID web push; 'android'/'ios' rows store "native:<platform>:<token>" as the endpoint.
alter table public.push_subscriptions add column if not exists platform text not null default 'web';
