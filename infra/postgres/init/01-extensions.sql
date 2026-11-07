-- Chạy một lần khi khởi tạo volume. Schema nằm trong infra/migrations (M2).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
