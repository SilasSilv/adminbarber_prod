CREATE POLICY scheduled_notifications_owner_policy ON scheduled_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = scheduled_notifications.appointment_id
      AND a.barbershop_id = (SELECT barbershop_id FROM appointments WHERE id = scheduled_notifications.appointment_id)
  )
);