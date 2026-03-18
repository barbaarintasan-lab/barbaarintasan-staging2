INSERT INTO alphabet_letters (arabic, name_arabic, name_somali, phase, "order", audio_url, tracing_path)
SELECT *
FROM (
  VALUES
    ('ا', 'ألف', 'Alif', 1, 1, '/api/audio/alphabet/alif.mp3', 'M50 10 L50 90'),
    ('ب', 'باء', 'Ba', 1, 2, '/api/audio/alphabet/ba.mp3', 'M20 45 Q50 20 80 45 Q50 70 20 45 M50 75 L50 85'),
    ('ت', 'تاء', 'Ta', 1, 3, '/api/audio/alphabet/ta.mp3', 'M20 50 Q50 25 80 50 Q50 75 20 50 M40 18 L40 20 M60 18 L60 20'),
    ('ث', 'ثاء', 'Tha', 1, 4, '/api/audio/alphabet/tha.mp3', 'M20 50 Q50 25 80 50 Q50 75 20 50 M35 18 L35 20 M50 14 L50 16 M65 18 L65 20'),
    ('ج', 'جيم', 'Jeem', 1, 5, '/api/audio/alphabet/jeem.mp3', 'M72 28 Q50 8 28 28 Q18 48 34 66 Q52 82 72 60 Q76 48 64 42 M50 82 L50 84'),
    ('ح', 'حاء', 'Ha', 1, 6, '/api/audio/alphabet/ha.mp3', 'M72 28 Q50 8 28 28 Q18 48 34 66 Q52 82 72 60 Q76 48 64 42'),
    ('خ', 'خاء', 'Kha', 1, 7, '/api/audio/alphabet/kha.mp3', 'M72 28 Q50 8 28 28 Q18 48 34 66 Q52 82 72 60 Q76 48 64 42 M52 10 L52 12'),
    ('د', 'دال', 'Dal', 2, 1, '/api/audio/alphabet/dal.mp3', 'M28 25 Q62 25 68 46 Q60 70 34 80'),
    ('ذ', 'ذال', 'Dhal', 2, 2, '/api/audio/alphabet/dhal.mp3', 'M28 25 Q62 25 68 46 Q60 70 34 80 M48 8 L48 10'),
    ('ر', 'راء', 'Ra', 2, 3, '/api/audio/alphabet/ra.mp3', 'M26 32 Q60 44 56 82'),
    ('ز', 'زاي', 'Zay', 2, 4, '/api/audio/alphabet/zay.mp3', 'M26 32 Q60 44 56 82 M46 12 L46 14'),
    ('س', 'سين', 'Seen', 2, 5, '/api/audio/alphabet/seen.mp3', 'M14 58 Q24 38 34 58 Q44 78 54 58 Q64 38 76 58'),
    ('ش', 'شين', 'Sheen', 2, 6, '/api/audio/alphabet/sheen.mp3', 'M14 58 Q24 38 34 58 Q44 78 54 58 Q64 38 76 58 M32 18 L32 20 M46 12 L46 14 M60 18 L60 20'),
    ('ص', 'صاد', 'Sad', 3, 1, '/api/audio/alphabet/sad.mp3', 'M18 36 L70 36 Q82 48 70 60 L18 60 M70 60 Q80 72 72 86'),
    ('ض', 'ضاد', 'Dad', 3, 2, '/api/audio/alphabet/dad.mp3', 'M18 36 L70 36 Q82 48 70 60 L18 60 M70 60 Q80 72 72 86 M40 14 L40 16'),
    ('ط', 'طاء', 'Taa', 3, 3, '/api/audio/alphabet/taa.mp3', 'M26 18 L26 86 M26 40 L70 40 Q82 50 70 60 L26 60'),
    ('ظ', 'ظاء', 'Zaa', 3, 4, '/api/audio/alphabet/zaa.mp3', 'M26 18 L26 86 M26 40 L70 40 Q82 50 70 60 L26 60 M48 8 L48 10'),
    ('ع', 'عين', 'Ain', 3, 5, '/api/audio/alphabet/ain.mp3', 'M70 24 Q44 6 26 26 Q20 46 40 56 Q54 64 62 74 Q48 88 26 76'),
    ('غ', 'غين', 'Ghain', 3, 6, '/api/audio/alphabet/ghain.mp3', 'M70 24 Q44 6 26 26 Q20 46 40 56 Q54 64 62 74 Q48 88 26 76 M48 8 L48 10'),
    ('ف', 'فاء', 'Fa', 4, 1, '/api/audio/alphabet/fa.mp3', 'M20 52 Q42 24 70 38 Q78 56 62 68 Q40 76 20 52 M46 20 L46 22'),
    ('ق', 'قاف', 'Qaf', 4, 2, '/api/audio/alphabet/qaf.mp3', 'M20 52 Q42 24 70 38 Q78 56 62 68 Q40 76 20 52 M40 18 L40 20 M54 18 L54 20'),
    ('ك', 'كاف', 'Kaf', 4, 3, '/api/audio/alphabet/kaf.mp3', 'M28 14 L28 86 M28 50 L62 30 M28 50 L62 74'),
    ('ل', 'لام', 'Lam', 4, 4, '/api/audio/alphabet/lam.mp3', 'M46 10 L46 90'),
    ('م', 'ميم', 'Meem', 4, 5, '/api/audio/alphabet/meem.mp3', 'M22 54 Q38 28 60 36 Q74 48 62 66 Q44 80 22 54'),
    ('ن', 'نون', 'Noon', 4, 6, '/api/audio/alphabet/noon.mp3', 'M18 52 Q44 28 72 46 Q58 72 18 52 M48 20 L48 22'),
    ('ه', 'هاء', 'Ha2', 4, 7, '/api/audio/alphabet/ha2.mp3', 'M34 26 Q20 44 34 62 Q48 78 62 62 Q76 46 62 28 Q48 14 34 26'),
    ('و', 'واو', 'Waw', 4, 8, '/api/audio/alphabet/waw.mp3', 'M38 24 Q58 30 60 50 Q58 72 40 82 Q24 70 30 46'),
    ('ي', 'ياء', 'Ya', 4, 9, '/api/audio/alphabet/ya.mp3', 'M18 50 Q42 28 72 46 Q56 70 20 58 M36 82 L36 84 M54 82 L54 84')
) AS seed(arabic, name_arabic, name_somali, phase, "order", audio_url, tracing_path)
WHERE NOT EXISTS (
  SELECT 1 FROM alphabet_letters
);