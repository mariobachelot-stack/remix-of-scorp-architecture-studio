-- Add 'cloud' to the allowed categories
ALTER TABLE equipment_library DROP CONSTRAINT IF EXISTS equipment_library_category_check;
ALTER TABLE equipment_library ADD CONSTRAINT equipment_library_category_check 
  CHECK (category IN ('hvac', 'lighting', 'metering', 'interface', 'scorp-io', 'cloud'));