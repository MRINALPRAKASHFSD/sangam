-- Official tag categories, tags and the Phase 1 filter catalog.

insert into public.tag_categories (slug, name, sort) values
  ('technology', 'Technology', 1),
  ('entertainment', 'Entertainment', 2),
  ('education', 'Education', 3),
  ('lifestyle', 'Lifestyle', 4),
  ('indian-communities', 'Indian Communities', 5)
on conflict (slug) do nothing;

insert into public.tags (slug, name, emoji, category_id, is_official, status)
select v.slug, v.name, v.emoji, c.id, true, 'active'
from (values
  ('programming', 'Programming', '💻', 'technology'),
  ('artificial-intelligence', 'Artificial Intelligence', '🤖', 'technology'),
  ('web-development', 'Web Development', '🌐', 'technology'),
  ('cybersecurity', 'Cybersecurity', '🛡️', 'technology'),
  ('hackathons', 'Hackathons', '⚡', 'technology'),
  ('open-source', 'Open Source', '🧩', 'technology'),
  ('anime', 'Anime', '🍥', 'entertainment'),
  ('gaming', 'Gaming', '🎮', 'entertainment'),
  ('music', 'Music', '🎧', 'entertainment'),
  ('movies', 'Movies', '🎬', 'entertainment'),
  ('photography', 'Photography', '📸', 'entertainment'),
  ('cricket', 'Cricket', '🏏', 'entertainment'),
  ('stand-up-comedy', 'Stand-up Comedy', '🎤', 'entertainment'),
  ('college-communities', 'College Communities', '🎓', 'education'),
  ('university-groups', 'University Groups', '🏛️', 'education'),
  ('school-communities', 'School Communities', '🏫', 'education'),
  ('competitive-programming', 'Competitive Programming', '🏆', 'education'),
  ('jee-neet-prep', 'JEE / NEET Prep', '📚', 'education'),
  ('fitness', 'Fitness', '💪', 'lifestyle'),
  ('travel', 'Travel', '✈️', 'lifestyle'),
  ('art', 'Art', '🎨', 'lifestyle'),
  ('books', 'Books', '📖', 'lifestyle'),
  ('fashion', 'Fashion', '👟', 'lifestyle'),
  ('food', 'Food', '🍛', 'lifestyle'),
  ('hindi', 'Hindi', 'हि', 'indian-communities'),
  ('bengali', 'Bengali', 'বা', 'indian-communities'),
  ('tamil', 'Tamil', 'த', 'indian-communities'),
  ('telugu', 'Telugu', 'తె', 'indian-communities'),
  ('punjabi', 'Punjabi', 'ਪੰ', 'indian-communities'),
  ('marathi', 'Marathi', 'म', 'indian-communities'),
  ('malayalam', 'Malayalam', 'മ', 'indian-communities'),
  ('kannada', 'Kannada', 'ಕ', 'indian-communities'),
  ('gujarati', 'Gujarati', 'ગુ', 'indian-communities'),
  ('assamese', 'Assamese', 'অ', 'indian-communities'),
  ('odia', 'Odia', 'ଓ', 'indian-communities'),
  ('urdu', 'Urdu', 'اُ', 'indian-communities')
) as v(slug, name, emoji, cat)
join public.tag_categories c on c.slug = v.cat
on conflict (slug) do nothing;

-- Filter params (interpreted by web/src/features/filters/engine.ts):
--   css:      canvas/CSS filter chain
--   overlay:  { colors: [hex, hex?], blend, opacity }
--   vignette, grain: 0..1
--   effect:   mirror | quad | flip | pixelate | posterize | scanlines | glow | letterbox
--   requires: capability not yet available on web (face-tracking, segmentation, creative-studio)
insert into public.filters (slug, name, category, kind, params, sort, is_trending) values
  ('original', 'Original', 'color', 'canvas', '{}', 0, false),
  ('vivid', 'Vivid', 'color', 'canvas', '{"css":"saturate(1.45) contrast(1.08)"}', 1, true),
  ('monsoon', 'Monsoon', 'color', 'canvas', '{"css":"saturate(0.9) hue-rotate(-10deg) brightness(1.04)","overlay":{"colors":["#3b82f6"],"blend":"soft-light","opacity":0.22}}', 2, false),
  ('chai', 'Chai', 'color', 'canvas', '{"css":"sepia(0.25) saturate(1.2)","overlay":{"colors":["#f59e0b"],"blend":"soft-light","opacity":0.22}}', 3, true),
  ('neon-nights', 'Neon Nights', 'color', 'canvas', '{"css":"saturate(1.6) contrast(1.15)","overlay":{"colors":["#8b5cf6","#22d3ee"],"blend":"overlay","opacity":0.3}}', 4, true),
  ('mono', 'Mono', 'color', 'canvas', '{"css":"grayscale(1) contrast(1.1)"}', 5, false),
  ('soft-glow', 'Soft Glow', 'beauty', 'canvas', '{"css":"brightness(1.06) contrast(0.95) saturate(1.08)","effect":"glow"}', 1, true),
  ('porcelain', 'Porcelain', 'beauty', 'canvas', '{"css":"brightness(1.1) contrast(0.9) saturate(0.88)"}', 2, false),
  ('golden-hour', 'Golden Hour', 'beauty', 'canvas', '{"css":"sepia(0.18) saturate(1.3) brightness(1.05)","overlay":{"colors":["#fb923c"],"blend":"soft-light","opacity":0.28}}', 3, false),
  ('polaroid-70s', 'Polaroid ''70s', 'vintage', 'canvas', '{"css":"sepia(0.45) contrast(0.9) saturate(1.2)","vignette":0.5,"grain":0.15}', 1, false),
  ('doordarshan', 'Doordarshan', 'vintage', 'canvas', '{"css":"grayscale(0.65) contrast(1.2)","vignette":0.4,"grain":0.25,"effect":"scanlines"}', 2, true),
  ('kodak-fade', 'Faded Film', 'vintage', 'canvas', '{"css":"contrast(0.85) brightness(1.08) saturate(0.8)","overlay":{"colors":["#fde68a"],"blend":"multiply","opacity":0.18},"grain":0.1}', 3, false),
  ('teal-orange', 'Teal & Orange', 'cinematic', 'canvas', '{"css":"contrast(1.15) saturate(1.2)","overlay":{"colors":["#0ea5e9","#f97316"],"blend":"soft-light","opacity":0.35},"vignette":0.35,"effect":"letterbox"}', 1, true),
  ('bollywood-drama', 'Bollywood Drama', 'cinematic', 'canvas', '{"css":"contrast(1.3) saturate(1.35)","overlay":{"colors":["#be123c"],"blend":"soft-light","opacity":0.18},"vignette":0.55}', 2, true),
  ('noir', 'Noir', 'cinematic', 'canvas', '{"css":"grayscale(1) contrast(1.45) brightness(0.92)","vignette":0.6,"grain":0.12}', 3, false),
  ('anime-pop', 'Anime Pop', 'artistic', 'canvas', '{"css":"saturate(1.9) contrast(1.2) brightness(1.05)","effect":"posterize"}', 1, true),
  ('duotone-violet', 'Duotone Violet', 'artistic', 'canvas', '{"css":"grayscale(1) contrast(1.2)","overlay":{"colors":["#7c3aed","#22d3ee"],"blend":"color","opacity":0.85}}', 2, false),
  ('pixel-8bit', '8-bit', 'artistic', 'canvas', '{"effect":"pixelate"}', 3, false),
  ('mirror-twin', 'Mirror Twin', 'funny', 'canvas', '{"effect":"mirror"}', 1, true),
  ('quad-squad', 'Quad Squad', 'funny', 'canvas', '{"effect":"quad"}', 2, false),
  ('upside-down', 'Upside Down', 'funny', 'canvas', '{"effect":"flip"}', 3, false),
  ('x-ray', 'X-Ray', 'funny', 'canvas', '{"css":"invert(1) grayscale(1) contrast(1.2)"}', 4, false),
  ('dog-ears', 'Puppy Ears', 'face', 'ar', '{"requires":"face-tracking"}', 1, false),
  ('sunnies', 'Desi Sunnies', 'face', 'ar', '{"requires":"face-tracking"}', 2, false),
  ('bg-blur', 'Portrait Blur', 'background', 'ar', '{"requires":"segmentation"}', 1, false),
  ('bg-studio', 'Studio Backdrop', 'background', 'ar', '{"requires":"segmentation"}', 2, false),
  ('neon-caption', 'Neon Caption', 'text', 'canvas', '{"requires":"creative-studio"}', 1, false),
  ('desi-script', 'Desi Script', 'text', 'canvas', '{"requires":"creative-studio"}', 2, false)
on conflict (slug) do nothing;
