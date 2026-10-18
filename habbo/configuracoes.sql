-- Ajustes do emulador para rodar no Docker (aplicados uma vez pelo instalar.sh).
INSERT INTO emulator_settings (`key`, `value`) VALUES
  ('camera.url', 'http://127.0.0.1:8080/usercontent/camera/'),
  ('imager.location.output.camera', '/app/assets/usercontent/camera/'),
  ('imager.location.output.thumbnail', '/app/assets/usercontent/camera/thumbnail/'),
  ('imager.url.youtube', 'http://127.0.0.1:8080/api/imageproxy/0x0/http://img.youtube.com/vi/%video%/default.jpg'),
  ('console.mode', '0'),
  ('imager.location.output.badges', '/app/assets/usercontent/badgeparts/generated/'),
  ('imager.location.badgeparts', '/app/assets/swf/c_images/Badgeparts'),
  ('websockets.whitelist', '*'),
  ('hotel.name', 'VLOC Hotel'),
  ('hotel.welcome.alert.enabled', '1'),
  ('hotel.welcome.alert.message', 'Bem-vindo ao VLOC Hotel, %user%!')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
