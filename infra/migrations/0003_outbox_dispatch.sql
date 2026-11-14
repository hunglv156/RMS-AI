-- Up Migration
-- Poller của outbox phải thấy job của MỌI tenant, nhưng RLS (FORCE) chặn mọi truy vấn không có context.
-- Hai hàm SECURITY DEFINER dưới đây là đường duy nhất, chỉ lộ metadata của job chưa gửi
-- (id, tenant, loại, payload); việc xử lý job vẫn chạy trong context tenant như mọi nơi khác.

CREATE FUNCTION outbox_pending(p_limit integer)
  RETURNS TABLE (id uuid, organization_id uuid, type text, payload_json jsonb)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT j.id, j.organization_id, j.type, j.payload_json
      FROM background_jobs j
     WHERE j.status = 'pending'
     ORDER BY j.created_at
     LIMIT p_limit
  $$;
REVOKE ALL ON FUNCTION outbox_pending(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION outbox_pending(integer) TO rms_app;

-- Down Migration
DROP FUNCTION IF EXISTS outbox_pending(integer);
