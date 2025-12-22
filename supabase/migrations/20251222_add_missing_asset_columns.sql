-- Add missing columns to assets table for crypto and extended investment support
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS coin_id text,
ADD COLUMN IF NOT EXISTS fees numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS isin text;

COMMENT ON COLUMN public.assets.coin_id IS 'Coingecko ID for crypto assets';
COMMENT ON COLUMN public.assets.fees IS 'Transaction fees associated with the asset purchase';
COMMENT ON COLUMN public.assets.isin IS 'International Securities Identification Number for investments';
