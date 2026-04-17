-- Drop the old constraint
ALTER TABLE public.equipment_library DROP CONSTRAINT equipment_library_protocol_check;

-- Add the new constraint with all protocols
ALTER TABLE public.equipment_library ADD CONSTRAINT equipment_library_protocol_check 
CHECK (protocol = ANY (ARRAY['none'::text, 'modbus-tcp'::text, 'modbus-rtu'::text, 'bacnet-ip'::text, 'bacnet-mstp'::text, 'lon'::text, 'cloud-api'::text, 'ethernet'::text, 'lorawan'::text]));