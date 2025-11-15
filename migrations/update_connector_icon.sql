-- Update Connector skill icon to Handshake for all users
UPDATE user_skills 
SET skill_icon = 'Handshake'
WHERE skill_name = 'Connector' AND (skill_icon IS NULL OR skill_icon = 'Network');

-- Update other default skill icons if they're missing
UPDATE user_skills SET skill_icon = 'Wrench' WHERE skill_name = 'Craftsman' AND skill_icon IS NULL;
UPDATE user_skills SET skill_icon = 'Palette' WHERE skill_name = 'Artist' AND skill_icon IS NULL;
UPDATE user_skills SET skill_icon = 'Brain' WHERE skill_name = 'Mindset' AND skill_icon IS NULL;
UPDATE user_skills SET skill_icon = 'Briefcase' WHERE skill_name = 'Merchant' AND skill_icon IS NULL;
UPDATE user_skills SET skill_icon = 'Activity' WHERE skill_name = 'Physical' AND skill_icon IS NULL;
UPDATE user_skills SET skill_icon = 'Book' WHERE skill_name = 'Scholar' AND skill_icon IS NULL;
UPDATE user_skills SET skill_icon = 'Users' WHERE skill_name = 'Charisma' AND skill_icon IS NULL;
UPDATE user_skills SET skill_icon = 'Heart' WHERE skill_name = 'Health' AND skill_icon IS NULL;
