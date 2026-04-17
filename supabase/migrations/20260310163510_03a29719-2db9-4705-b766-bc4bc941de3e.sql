ALTER TABLE public.equipment_library DROP CONSTRAINT equipment_library_category_check;
ALTER TABLE public.equipment_library ADD CONSTRAINT equipment_library_category_check 
  CHECK (category = ANY (ARRAY['hvac','lighting','metering','interface','scorp-io','cloud','saved-model']));