-- Add 'sftp' to the allowed protocols
ALTER TABLE equipment_library DROP CONSTRAINT IF EXISTS equipment_library_protocol_check;
ALTER TABLE equipment_library ADD CONSTRAINT equipment_library_protocol_check 
  CHECK (protocol IN ('modbus-tcp', 'modbus-rtu', 'bacnet-ip', 'lorawan', 'cloud-api', 'sftp', 'none'));